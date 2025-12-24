/**
 * 📊 SISTEMA DE MÉTRICAS DE IMPACTO PARA MENTORES
 * 
 * Calcula y actualiza métricas basadas en el rendimiento de mentorados:
 * - Mentorados activos
 * - Evidencias HIGH QUALITY generadas
 * - XP total acumulado por mentorados
 * - Sistema de puntos para level-up dinámico
 */

import { prisma } from './prisma';

// =====================================================
// CONFIGURACIÓN DE PESOS (Sistema de Puntos)
// =====================================================
const PESOS_PUNTOS = {
  sesionCompletada: 3,        // 3 pts por sesión completada
  estrella: 20,               // 20 pts por estrella de rating
  mentoradoActivo: 5,         // 5 pts por mentorado activo
  evidenciaHighQuality: 2,    // 2 pts por evidencia HQ de mentorado
  xpPor100: 1                 // 1 pt por cada 100 XP generado por mentorados
};

// =====================================================
// FUNCIÓN PRINCIPAL: Actualizar Métricas del Mentor
// =====================================================
export async function actualizarMetricasMentor(mentorId: number): Promise<void> {
  try {
    console.log(`📊 Actualizando métricas del mentor ${mentorId}...`);

    // 1. Contar mentorados activos
    const mentoradosActivos = await prisma.usuario.count({
      where: {
        OR: [
          { mentorId: mentorId },
          { assignedMentorId: mentorId }
        ],
        isActive: true,
        rol: 'PARTICIPANTE'
      }
    });

    // 2. Contar total histórico de mentorados (incluye inactivos)
    const mentoradosTotales = await prisma.usuario.count({
      where: {
        OR: [
          { mentorId: mentorId },
          { assignedMentorId: mentorId }
        ],
        rol: 'PARTICIPANTE'
      }
    });

    // 3. Contar evidencias HIGH QUALITY de mentorados
    const evidenciasHQ = await prisma.evidenciaAccion.count({
      where: {
        Usuario: {
          OR: [
            { mentorId: mentorId },
            { assignedMentorId: mentorId }
          ]
        },
        highQuality: true,
        estado: 'APROBADA'
      }
    });

    // 4. Sumar XP total de mentorados activos
    const mentorados = await prisma.usuario.findMany({
      where: {
        OR: [
          { mentorId: mentorId },
          { assignedMentorId: mentorId }
        ],
        isActive: true
      },
      select: {
        experienciaXP: true
      }
    });

    const xpTotal = mentorados.reduce((sum, m) => sum + m.experienciaXP, 0);
    const promedioXP = mentoradosActivos > 0 ? xpTotal / mentoradosActivos : 0;

    // 5. Calcular porcentaje de HIGH QUALITY
    const totalEvidencias = await prisma.evidenciaAccion.count({
      where: {
        Usuario: {
          OR: [
            { mentorId: mentorId },
            { assignedMentorId: mentorId }
          ]
        },
        estado: 'APROBADA'
      }
    });

    const porcentajeHQ = totalEvidencias > 0 ? (evidenciasHQ / totalEvidencias) * 100 : 0;

    // 6. Obtener perfil actual del mentor para calcular puntos
    const perfilActual = await prisma.perfilMentor.findUnique({
      where: { usuarioId: mentorId },
      select: {
        completedSessionsCount: true,
        calificacionPromedio: true
      }
    });

    if (!perfilActual) {
      console.warn(`⚠️ No se encontró perfil de mentor para usuario ${mentorId}`);
      return;
    }

    // 7. CALCULAR PUNTOS TOTALES (Sistema de Puntos)
    let puntosTotales = 0;
    
    // Puntos por sesiones completadas
    puntosTotales += perfilActual.completedSessionsCount * PESOS_PUNTOS.sesionCompletada;
    
    // Puntos por rating (cada estrella vale 20 pts)
    puntosTotales += Math.floor(perfilActual.calificacionPromedio * PESOS_PUNTOS.estrella);
    
    // Puntos por mentorados activos
    puntosTotales += mentoradosActivos * PESOS_PUNTOS.mentoradoActivo;
    
    // Puntos por evidencias HIGH QUALITY
    puntosTotales += evidenciasHQ * PESOS_PUNTOS.evidenciaHighQuality;
    
    // Puntos por XP generado (1 pt cada 100 XP)
    puntosTotales += Math.floor(xpTotal / 100) * PESOS_PUNTOS.xpPor100;

    // 8. Actualizar perfil del mentor
    await prisma.perfilMentor.update({
      where: { usuarioId: mentorId },
      data: {
        mentoradosActivos,
        mentoradosTotales,
        evidenciasHighQuality: evidenciasHQ,
        xpTotalMentorados: xpTotal,
        promedioXPPorMentorado: promedioXP,
        porcentajeHighQuality: porcentajeHQ,
        puntosTotales,
        lastMetricsUpdate: new Date()
      }
    });

    console.log(`✅ Métricas actualizadas para mentor ${mentorId}:`);
    console.log(`   - Mentorados activos: ${mentoradosActivos}`);
    console.log(`   - Evidencias HQ: ${evidenciasHQ} (${porcentajeHQ.toFixed(1)}%)`);
    console.log(`   - XP total: ${xpTotal.toLocaleString()} (promedio: ${promedioXP.toFixed(0)})`);
    console.log(`   - 🎯 PUNTOS TOTALES: ${puntosTotales}`);

  } catch (error) {
    console.error(`❌ Error al actualizar métricas del mentor ${mentorId}:`, error);
    // No lanzamos el error para no afectar el flujo principal
  }
}

// =====================================================
// FUNCIÓN: Actualizar Métricas de Todos los Mentores
// =====================================================
export async function actualizarTodasLasMetricas(): Promise<void> {
  try {
    console.log('🔄 Iniciando actualización masiva de métricas...');

    const mentores = await prisma.perfilMentor.findMany({
      select: { usuarioId: true, Usuario: { select: { nombre: true } } }
    });

    console.log(`📋 Se encontraron ${mentores.length} mentores para actualizar\n`);

    for (const mentor of mentores) {
      console.log(`\n👤 Procesando: ${mentor.Usuario.nombre}`);
      await actualizarMetricasMentor(mentor.usuarioId);
    }

    console.log('\n✅ Actualización masiva completada');

  } catch (error) {
    console.error('❌ Error en actualización masiva:', error);
    throw error;
  }
}

// =====================================================
// FUNCIÓN: Obtener Desglose de Puntos
// =====================================================
export async function obtenerDesgloseGanador(mentorId: number) {
  const perfil = await prisma.perfilMentor.findUnique({
    where: { usuarioId: mentorId }
  });

  if (!perfil) return null;

  const desglose = {
    sesiones: {
      cantidad: perfil.completedSessionsCount,
      puntos: perfil.completedSessionsCount * PESOS_PUNTOS.sesionCompletada,
      peso: PESOS_PUNTOS.sesionCompletada
    },
    rating: {
      promedio: perfil.calificacionPromedio,
      puntos: Math.floor(perfil.calificacionPromedio * PESOS_PUNTOS.estrella),
      peso: PESOS_PUNTOS.estrella
    },
    mentorados: {
      cantidad: perfil.mentoradosActivos,
      puntos: perfil.mentoradosActivos * PESOS_PUNTOS.mentoradoActivo,
      peso: PESOS_PUNTOS.mentoradoActivo
    },
    evidenciasHQ: {
      cantidad: perfil.evidenciasHighQuality,
      puntos: perfil.evidenciasHighQuality * PESOS_PUNTOS.evidenciaHighQuality,
      peso: PESOS_PUNTOS.evidenciaHighQuality
    },
    xpGenerado: {
      total: perfil.xpTotalMentorados,
      puntos: Math.floor(perfil.xpTotalMentorados / 100) * PESOS_PUNTOS.xpPor100,
      peso: PESOS_PUNTOS.xpPor100
    },
    total: perfil.puntosTotales
  };

  return desglose;
}
