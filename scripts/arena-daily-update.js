/**
 * ⚔️ QUANTUM ARENA - Job Diario
 * Ejecutar cada noche a las 11:59 PM
 * Actualiza HP de todos los duelos activos
 * 
 * Uso: node scripts/arena-daily-update.js
 */

import { PrismaClient } from '@prisma/client';
import { updateDailyHP } from '../lib/arena-referee.js';
import { generateNarration } from '../lib/arena-narrator.js';

const prisma = new PrismaClient();

async function runDailyUpdate() {
  console.log('⚔️ [ARENA] Iniciando actualización diaria de HP...');
  console.log(`Fecha: ${new Date().toISOString()}\n`);

  try {
    // Obtener todos los duelos activos
    const activeDuels = await prisma.arenaDuel.findMany({
      where: { status: 'ACTIVE' },
      include: {
        Player1: { select: { nombre: true } },
        Player2: { select: { nombre: true } },
      },
    });

    console.log(`📊 Duelos activos: ${activeDuels.length}\n`);

    if (activeDuels.length === 0) {
      console.log('✅ No hay duelos activos para actualizar');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const duel of activeDuels) {
      console.log(`Procesando Duelo ${duel.id}:`);
      console.log(`  ${duel.Player1.nombre} (${duel.player1HP} HP) vs ${duel.Player2.nombre} (${duel.player2HP} HP)`);

      // Actualizar HP
      await updateDailyHP(duel.id, today);

      // Obtener el update creado
      const dailyUpdate = await prisma.arenaDailyUpdate.findUnique({
        where: {
          duelId_date: {
            duelId: duel.id,
            date: today,
          },
        },
      });

      if (dailyUpdate) {
        // Generar narración
        const daysRemaining = Math.ceil(
          (duel.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const narration = generateNarration({
          myHP: dailyUpdate.player1HP,
          rivalHP: dailyUpdate.player2HP,
          myDamage: dailyUpdate.player1Damage,
          rivalDamage: dailyUpdate.player2Damage,
          myName: duel.Player1.nombre,
          rivalName: duel.Player2.nombre,
          daysRemaining,
        });

        // Guardar narración
        await prisma.arenaDailyUpdate.update({
          where: { id: dailyUpdate.id },
          data: { narration },
        });

        console.log(`  ✅ HP actualizado | P1: ${dailyUpdate.player1HP} HP | P2: ${dailyUpdate.player2HP} HP`);
        console.log(`  📢 Narración: "${narration}"`);
      }

      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Actualización diaria completada');
  } catch (error) {
    console.error('❌ Error en actualización diaria:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
runDailyUpdate()
  .then(() => {
    console.log('🎯 Job finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Job falló:', error);
    process.exit(1);
  });
