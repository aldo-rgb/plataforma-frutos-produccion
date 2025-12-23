/**
 * ⚔️ QUANTUM ARENA - Job Domingo
 * Ejecutar cada Domingo a las 11:59 PM
 * Resuelve todos los duelos de la semana
 * 
 * Uso: node scripts/arena-sunday-resolution.js
 */

import { PrismaClient } from '@prisma/client';
import { resolveSundayDuels } from '../lib/arena-referee.js';

const prisma = new PrismaClient();

async function runSundayResolution() {
  console.log('🏆 [ARENA] Iniciando resolución de duelos dominical...');
  console.log(`Fecha: ${new Date().toISOString()}\n`);

  try {
    // Ejecutar resolución
    await resolveSundayDuels();

    // Obtener estadísticas de duelos resueltos hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const resolvedDuels = await prisma.arenaDuel.findMany({
      where: {
        status: 'COMPLETED',
        resolvedAt: {
          gte: today,
        },
      },
      include: {
        Winner: { select: { nombre: true } },
        Player1: { select: { nombre: true } },
        Player2: { select: { nombre: true } },
      },
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 RESUMEN DE RESOLUCIONES:');
    console.log(`   Duelos resueltos: ${resolvedDuels.length}`);

    const wins = resolvedDuels.filter((d) => d.resolutionType === 'WIN').length;
    const ties = resolvedDuels.filter((d) => d.resolutionType === 'TIE').length;
    const doubleKOs = resolvedDuels.filter((d) => d.resolutionType === 'DOUBLE_KO').length;

    console.log(`   Victorias: ${wins}`);
    console.log(`   Empates: ${ties}`);
    console.log(`   Doble K.O.: ${doubleKOs}`);

    const totalPCAwarded = resolvedDuels.reduce((sum, d) => sum + (d.prize || 0), 0);
    const totalPCBurned = doubleKOs * 1000;

    console.log(`   PC entregados: ${totalPCAwarded}`);
    console.log(`   PC quemados: ${totalPCBurned}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Mostrar detalles de cada duelo
    resolvedDuels.forEach((duel) => {
      console.log(`Duelo ${duel.id}:`);
      console.log(`  ${duel.Player1.nombre} vs ${duel.Player2.nombre}`);
      
      if (duel.resolutionType === 'WIN' && duel.Winner) {
        console.log(`  🏆 Ganador: ${duel.Winner.nombre} (${duel.prize} PC)`);
      } else if (duel.resolutionType === 'TIE') {
        console.log(`  🤝 Empate - Ambos recibieron ${duel.prize! / 2} PC`);
      } else if (duel.resolutionType === 'DOUBLE_KO') {
        console.log(`  💀 Doble K.O. - 1000 PC quemados`);
      }
      console.log('');
    });

    console.log('✅ Resolución dominical completada');
  } catch (error) {
    console.error('❌ Error en resolución dominical:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
runSundayResolution()
  .then(() => {
    console.log('🎯 Job finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Job falló:', error);
    process.exit(1);
  });
