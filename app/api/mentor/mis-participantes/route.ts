import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener todos los participantes asignados a un mentor
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener el mentor actual
    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que sea mentor
    if (mentor.rol !== 'MENTOR' && mentor.rol !== 'COORDINADOR' && mentor.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Obtener participantes asignados con su información completa
    const participantes = await prisma.usuario.findMany({
      where: {
        assignedMentorId: mentor.id,
        rol: 'PARTICIPANTE',
        isActive: true
      },
      include: {
        CartaFrutos: {
          include: {
            Meta: {
              include: {
                Accion: true
              }
            }
          }
        },
        CallBooking_CallBooking_studentIdToUsuario: {
          where: {
            status: 'COMPLETED'
          },
          orderBy: {
            scheduledAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Calcular métricas para cada participante
    const participantesConMetricas = participantes.map(p => {
      const carta = p.CartaFrutos[0];
      const metas = carta?.Meta || [];
      const totalMetas = metas.length;
      const metasCompletadas = metas.filter(m => m.avance >= 100).length;
      
      // Calcular progreso general (promedio de todas las metas)
      const progresoGeneral = totalMetas > 0 
        ? Math.round(metas.reduce((acc, m) => acc + m.avance, 0) / totalMetas)
        : 0;

      // Determinar estado basado en progreso y actividad
      let estado: 'Activo' | 'Riesgo' | 'Inactivo' = 'Activo';
      const ultimaSesion = p.CallBooking_CallBooking_studentIdToUsuario[0];
      
      if (!ultimaSesion) {
        estado = 'Riesgo';
      } else {
        const diasDesdeUltimaSesion = Math.floor(
          (Date.now() - new Date(ultimaSesion.scheduledAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diasDesdeUltimaSesion > 30) {
          estado = 'Inactivo';
        } else if (diasDesdeUltimaSesion > 14 || progresoGeneral < 40) {
          estado = 'Riesgo';
        }
      }

      // Formatear fecha de última sesión
      const ultimaSesionFecha = ultimaSesion 
        ? new Date(ultimaSesion.scheduledAt).toLocaleDateString('es-MX', { 
            day: 'numeric', 
            month: 'short' 
          })
        : null;

      return {
        id: p.id,
        nombre: p.nombre,
        email: p.email,
        imagen: p.imagen,
        progreso: progresoGeneral,
        estado,
        plan: p.planActual || 'Sin plan',
        ultimaSesion: ultimaSesionFecha,
        puntosGamificacion: p.puntosGamificacion || 0,
        metasCompletadas,
        totalMetas
      };
    });

    console.log(`✅ Mentor ${mentor.nombre}: ${participantesConMetricas.length} participantes`);

    return NextResponse.json({
      success: true,
      participantes: participantesConMetricas,
      total: participantesConMetricas.length,
      activos: participantesConMetricas.filter(p => p.estado === 'Activo').length,
      enRiesgo: participantesConMetricas.filter(p => p.estado === 'Riesgo').length,
      inactivos: participantesConMetricas.filter(p => p.estado === 'Inactivo').length
    });

  } catch (error) {
    console.error('❌ Error al obtener participantes:', error);
    return NextResponse.json(
      { error: 'Error al obtener participantes' }, 
      { status: 500 }
    );
  }
}
