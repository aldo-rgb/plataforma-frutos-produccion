/**
 * 🚀 Script de Inicialización del Sistema de Puntos para Mentores
 * 
 * Este script:
 * 1. Calcula métricas históricas para todos los mentores
 * 2. Actualiza el sistema de puntos
 * 3. Re-evalúa niveles con el nuevo sistema
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importamos la función de actualización
// (Nota: En producción usar import, en script node usamos require)

const PESOS_PUNTOS = {
  sesionCompletada: 3,
  estrella: 20,
  mentoradoActivo: 5,
  evidenciaHighQuality: 2,
  xpPor100: 1
};

async function actualizarMetricasMentor(mentorId) {
  try {
    console.log(`\n📊 Procesando mentor ID ${mentorId}...`);

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

    // 2. Contar total histórico
    const mentoradosTotales = await prisma.usuario.count({
      where: {
        OR: [
          { mentorId: mentorId },
          { assignedMentorId: mentorId }
        ],
        rol: 'PARTICIPANTE'
      }
    });

    // 3. Contar evidencias HIGH QUALITY
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

    // 4. Sumar XP total
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

    // 5. Calcular porcentaje HIGH QUALITY
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

    // 6. Obtener perfil para calcular puntos
    const perfilActual = await prisma.perfilMentor.findUnique({
      where: { usuarioId: mentorId },
      select: {
        completedSessionsCount: true,
        calificacionPromedio: true,
        Usuario: {
          select: { nombre: true }
        }
      }
    });

    if (!perfilActual) {
      console.warn(`⚠️ No se encontró perfil para mentor ${mentorId}`);
      return null;
    }

    // 7. CALCULAR PUNTOS TOTALES
    let puntosTotales = 0;
    puntosTotales += perfilActual.completedSessionsCount * PESOS_PUNTOS.sesionCompletada;
    puntosTotales += Math.floor(perfilActual.calificacionPromedio * PESOS_PUNTOS.estrella);
    puntosTotales += mentoradosActivos * PESOS_PUNTOS.mentoradoActivo;
    puntosTotales += evidenciasHQ * PESOS_PUNTOS.evidenciaHighQuality;
    puntosTotales += Math.floor(xpTotal / 100) * PESOS_PUNTOS.xpPor100;

    // 8. Actualizar perfil
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

    console.log(`✅ ${perfilActual.Usuario.nombre}:`);
    console.log(`   - Mentorados: ${mentoradosActivos} activos / ${mentoradosTotales} total`);
    console.log(`   - Evidencias HQ: ${evidenciasHQ} (${porcentajeHQ.toFixed(1)}%)`);
    console.log(`   - XP total: ${xpTotal.toLocaleString()} (promedio: ${promedioXP.toFixed(0)})`);
    console.log(`   - Sesiones: ${perfilActual.completedSessionsCount}`);
    console.log(`   - Rating: ${perfilActual.calificacionPromedio.toFixed(2)} ⭐`);
    console.log(`   - 🎯 PUNTOS TOTALES: ${puntosTotales}`);

    return {
      mentorId,
      nombre: perfilActual.Usuario.nombre,
      puntosTotales,
      mentoradosActivos,
      evidenciasHQ,
      xpTotal
    };

  } catch (error) {
    console.error(`❌ Error procesando mentor ${mentorId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 INICIALIZACIÓN DEL SISTEMA DE PUNTOS PARA MENTORES\n');
  console.log('Este script calculará métricas históricas y actualizará el sistema de puntos.\n');

  try {
    // Obtener todos los mentores
    const mentores = await prisma.perfilMentor.findMany({
      select: {
        usuarioId: true,
        Usuario: {
          select: { nombre: true }
        }
      }
    });

    console.log(`📋 Se encontraron ${mentores.length} mentores para procesar\n`);
    console.log('═'.repeat(80));

    const resultados = [];

    for (const mentor of mentores) {
      const resultado = await actualizarMetricasMentor(mentor.usuarioId);
      if (resultado) {
        resultados.push(resultado);
      }
      console.log('─'.repeat(80));
    }

    // Resumen final
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(80));
    console.log(`Total procesados: ${resultados.length}`);
    console.log(`\n🏆 TOP 5 POR PUNTOS:\n`);

    resultados
      .sort((a, b) => b.puntosTotales - a.puntosTotales)
      .slice(0, 5)
      .forEach((r, i) => {
        console.log(`${i + 1}. ${r.nombre}`);
        console.log(`   🎯 ${r.puntosTotales} puntos`);
        console.log(`   👥 ${r.mentoradosActivos} mentorados`);
        console.log(`   ⭐ ${r.evidenciasHQ} evidencias HQ`);
        console.log(`   💫 ${r.xpTotal.toLocaleString()} XP generado`);
        console.log('');
      });

    console.log('═'.repeat(80));
    console.log('\n✅ Inicialización completada exitosamente');
    console.log('\n💡 Ahora los mentores tienen métricas de impacto calculadas.');
    console.log('   El sistema evaluará automáticamente su nivel basado en:');
    console.log('   - Sesiones completadas (mínimo)');
    console.log('   - Rating promedio (mínimo)');
    console.log('   - 🎯 Sistema de Puntos (incluye XP de mentorados)\n');

  } catch (error) {
    console.error('❌ Error en el script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
