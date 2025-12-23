/**
 * 🧬 QUANTUM PATTERNS - Job Semanal
 * Ejecutar cada Domingo a las 11 PM
 * Analiza patrones de todos los usuarios activos
 * 
 * Uso: node scripts/quantum-weekly-analysis.js
 */

import { PrismaClient } from '@prisma/client';
import { analyzeUserPatterns, savePatterns } from '../lib/quantum-engine.js';

const prisma = new PrismaClient();

async function runWeeklyAnalysis() {
  console.log('🧬 [QUANTUM] Iniciando análisis semanal de patrones...');
  console.log(`Fecha: ${new Date().toISOString()}\n`);

  try {
    // Obtener todos los usuarios activos (con al menos 1 tarea en el último mes)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const activeUsers = await prisma.usuario.findMany({
      where: {
        activo: true,
        TaskInstance: {
          some: {
            createdAt: {
              gte: oneMonthAgo,
            },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
    });

    console.log(`📊 Usuarios activos a analizar: ${activeUsers.length}\n`);

    let patternsDetected = 0;
    let usersWithPatterns = 0;

    for (const user of activeUsers) {
      console.log(`Analizando: ${user.nombre} (${user.email})`);

      try {
        const patterns = await analyzeUserPatterns(user.id);

        if (patterns.length > 0) {
          await savePatterns(user.id, patterns);
          patternsDetected += patterns.length;
          usersWithPatterns++;
          console.log(`  ✅ ${patterns.length} patrón(es) detectado(s)`);
        } else {
          console.log(`  ⚪ Sin patrones significativos`);
        }
      } catch (error: any) {
        console.error(`  ❌ Error al analizar usuario ${user.id}:`, error.message);
      }

      console.log(''); // Línea en blanco
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 RESUMEN DEL ANÁLISIS:');
    console.log(`   Usuarios analizados: ${activeUsers.length}`);
    console.log(`   Usuarios con patrones: ${usersWithPatterns}`);
    console.log(`   Patrones detectados: ${patternsDetected}`);
    console.log(`   Tasa de detección: ${Math.round((usersWithPatterns / activeUsers.length) * 100)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Análisis semanal completado exitosamente');
  } catch (error) {
    console.error('❌ Error en el análisis semanal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
runWeeklyAnalysis()
  .then(() => {
    console.log('🎯 Job finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Job falló:', error);
    process.exit(1);
  });
