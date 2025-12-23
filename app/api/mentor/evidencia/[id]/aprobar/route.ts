import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitToUser } from '@/lib/socket';
import { otorgarRecompensaPorEvidencia, verificarYOtorgarBonusDiaPerfecto } from '@/lib/rewardEngine';
import { evaluarCalidadEvidencia, aplicarBonusRareza } from '@/lib/quantumCurator';
import { verificarColecciones } from '@/lib/collectionVerifier';

// PUT: Aprobar evidencia y otorgar puntos
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const evidenciaId = parseInt(params.id);

    if (isNaN(evidenciaId)) {
      return NextResponse.json({ error: 'ID de evidencia inválido' }, { status: 400 });
    }

    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (mentor.rol !== 'MENTOR' && mentor.rol !== 'COORDINADOR' && mentor.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Verificar que la evidencia existe
    const evidencia = await prisma.evidenciaAccion.findUnique({
      where: { id: evidenciaId },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true,
            puntosGamificacion: true
          }
        },
        Accion: {
          select: {
            texto: true,
            frequency: true,
            rarity: true
          }
        }
      }
    });

    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });
    }

    if (evidencia.estado !== 'PENDIENTE') {
      return NextResponse.json({ 
        error: `La evidencia ya fue revisada (Estado: ${evidencia.estado})` 
      }, { status: 400 });
    }

    // ========== QUANTUM CURATOR: EVALUACIÓN DE CALIDAD ==========
    console.log('🤖 QUANTUM Curator evaluando calidad de evidencia...');
    
    const evaluacionCalidad = await evaluarCalidadEvidencia(
      evidencia.fotoUrl,
      evidencia.descripcion,
      evidencia.Accion.texto,
      evidencia.Accion.frequency || 'DAILY'
    );

    console.log(`   Score: ${evaluacionCalidad.qualityScore}/100`);
    console.log(`   High Quality: ${evaluacionCalidad.isHighQuality ? '✅' : '❌'}`);
    console.log(`   Rarity Bonus: ${evaluacionCalidad.rarityBonus ? '🔥' : '➖'}`);

    // ========== NUEVO SISTEMA DE RECOMPENSAS ==========
    
    // 1. Aprobar evidencia CON datos de calidad
    const evidenciaAprobada = await prisma.evidenciaAccion.update({
      where: { id: evidenciaId },
      data: {
        estado: 'APROBADA',
        revisadoPorId: mentor.id,
        fechaRevision: new Date(),
        highQuality: evaluacionCalidad.isHighQuality,
        qualityScore: evaluacionCalidad.qualityScore,
        rarityBonus: evaluacionCalidad.rarityBonus
      },
      include: {
        Accion: true
      }
    });

    // 2. Otorgar recompensas equilibradas (XP + PC según rareza)
    const recompensa = await otorgarRecompensaPorEvidencia(
      evidencia.usuarioId,
      evidenciaId,
      evidenciaAprobada.accionId
    );

    // Aplicar bonus de rareza si QUANTUM lo determinó
    let rarezaFinal = recompensa.rarezaTarea;
    let pcBonus = 0;
    
    if (evaluacionCalidad.rarityBonus) {
      rarezaFinal = aplicarBonusRareza(recompensa.rarezaTarea, true) as any;
      
      // Calcular PC adicionales por el upgrade de rareza
      const bonusPC: Record<string, number> = {
        'UNCOMMON': 15,  // +15 PC (de COMMON a UNCOMMON)
        'RARE': 80,      // +80 PC (de UNCOMMON a RARE)
        'EPIC': 200,     // +200 PC (de RARE a EPIC)
        'LEGENDARY': 200 // +200 PC (de EPIC a LEGENDARY)
      };
      
      pcBonus = bonusPC[rarezaFinal] || 0;
      
      if (pcBonus > 0) {
        await prisma.usuario.update({
          where: { id: evidencia.usuarioId },
          data: {
            puntosCuanticos: {
              increment: pcBonus
            }
          }
        });

        console.log(`   🔥 BONUS DE RAREZA: ${recompensa.rarezaTarea} → ${rarezaFinal} (+${pcBonus} PC)`);
      }
    }

    // 3. Verificar y otorgar bonus de día perfecto
    const bonusDiario = await verificarYOtorgarBonusDiaPerfecto(
      evidencia.usuarioId,
      new Date()
    );

    // 4. Verificar colecciones completadas
    const coleccionesNuevas = await verificarColecciones(evidencia.usuarioId);

    const pcTotalColecciones = coleccionesNuevas.reduce((sum, col) => sum + col.recompensaPC, 0);

    console.log(`✅ Evidencia ${evidenciaId} APROBADA por ${mentor.nombre}`);
    console.log(`   ${evidencia.Usuario.nombre} ganó:
      +${recompensa.xpGanado} XP (${rarezaFinal}${evaluacionCalidad.rarityBonus ? ' ⬆️' : ''})
      +${recompensa.pcGanado + pcBonus} PC${pcBonus > 0 ? ` (bonus calidad: +${pcBonus})` : ''}
      ${bonusDiario.otorgado ? `+ BONUS DÍA PERFECTO: +${bonusDiario.pcGanados} PC 🎉` : ''}
      ${coleccionesNuevas.length > 0 ? `+ COLECCIONES: ${coleccionesNuevas.map(c => c.coleccionId).join(', ')} (+${pcTotalColecciones} PC) 🏆` : ''}
      ${recompensa.subioDeNivel ? `¡SUBIÓ AL NIVEL ${recompensa.nivelNuevo}! 🎊` : ''}
      📊 Calidad: ${evaluacionCalidad.qualityScore}/100 ${evaluacionCalidad.isHighQuality ? '⭐' : ''}`
    );

    // 4. Enviar notificación en tiempo real
    try {
      const pcTotal = recompensa.pcGanado + pcBonus + (bonusDiario.otorgado ? bonusDiario.pcGanados : 0) + pcTotalColecciones;
      
      const notificacion = {
        evidenciaId: evidencia.id,
        mensaje: recompensa.mensaje,
        xpGanado: recompensa.xpGanado,
        pcGanado: pcTotal,
        rarezaTarea: rarezaFinal,
        rarezaUpgrade: evaluacionCalidad.rarityBonus,
        qualityScore: evaluacionCalidad.qualityScore,
        isHighQuality: evaluacionCalidad.isHighQuality,
        subioDeNivel: recompensa.subioDeNivel,
        nivelNuevo: recompensa.nivelNuevo,
        bonusDiaPerfecto: bonusDiario.otorgado,
        coleccionesCompletadas: coleccionesNuevas,
        mentorNombre: mentor.nombre,
        // Datos para animación legendaria
        showLegendaryAnimation: rarezaFinal === 'LEGENDARY' || rarezaFinal === 'EPIC',
        artifactData: {
          imageUrl: evidencia.fotoUrl,
          descripcion: evidencia.descripcion || evidencia.Accion.texto,
          rareza: rarezaFinal,
          xpGanado: recompensa.xpGanado,
          pcGanado: pcTotal,
          nivelNuevo: recompensa.nivelNuevo,
          subioDeNivel: recompensa.subioDeNivel
        }
      };

      emitToUser(evidencia.usuarioId.toString(), 'evidencia_aprobada', notificacion);
    } catch (socketError) {
      console.error('Error al enviar notificación Socket.IO:', socketError);
    }

    return NextResponse.json({ 
      success: true,
      message: recompensa.mensaje,
      xpGanado: recompensa.xpGanado,
      pcGanado: recompensa.pcGanado + pcBonus,
      pcTotal: recompensa.pcGanado + pcBonus + (bonusDiario.otorgado ? bonusDiario.pcGanados : 0) + pcTotalColecciones,
      rarezaTarea: rarezaFinal,
      rarezaUpgrade: evaluacionCalidad.rarityBonus,
      qualityScore: evaluacionCalidad.qualityScore,
      isHighQuality: evaluacionCalidad.isHighQuality,
      qualityFeedback: evaluacionCalidad.feedback,
      subioDeNivel: recompensa.subioDeNivel,
      nivelAnterior: recompensa.nivelAnterior,
      nivelNuevo: recompensa.nivelNuevo,
      bonusDiaPerfecto: bonusDiario.otorgado,
      bonusDiaPerfectoPC: bonusDiario.pcGanados,
      coleccionesCompletadas: coleccionesNuevas,
      // Trigger para animación legendaria en el cliente
      showLegendaryAnimation: rarezaFinal === 'LEGENDARY' || rarezaFinal === 'EPIC'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al aprobar evidencia:', error);
    return NextResponse.json({ error: 'Error al aprobar evidencia' }, { status: 500 });
  }
}
