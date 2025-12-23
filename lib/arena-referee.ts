/**
 * ⚔️ QUANTUM ARENA - Motor de Reglas del Duelo (Referee Engine)
 * Gestiona HP, daño diario y resolución final
 */

import { prisma } from '@/lib/prisma';
import { ResolutionType } from '@prisma/client';

const HP_LOSS_PER_FAILURE = 15;
const TIE_BONUS = 50; // PC bonus por empate
const BURN_THRESHOLD = 0.5; // <50% cumplimiento = Doble KO

/**
 * Calcular cumplimiento diario del usuario
 * Retorna true si completó 100% de sus tareas programadas
 */
async function checkDailyCompletion(usuarioId: number, date: Date): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Obtener tareas programadas para hoy
  const tasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId,
      dueDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (tasks.length === 0) {
    // Si no tiene tareas, se considera cumplimiento al 100%
    return true;
  }

  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const completionRate = completedTasks / tasks.length;

  return completionRate === 1.0; // 100% de cumplimiento
}

/**
 * Actualizar HP diario (Ejecutar cada noche a las 11:59 PM)
 */
export async function updateDailyHP(duelId: number, date: Date) {
  const duel = await prisma.arenaDuel.findUnique({
    where: { id: duelId },
    include: {
      Player1: { select: { id: true, nombre: true } },
      Player2: { select: { id: true, nombre: true } },
    },
  });

  if (!duel || duel.status !== 'ACTIVE') {
    return;
  }

  // Verificar cumplimiento de ambos jugadores
  const player1Completed = await checkDailyCompletion(duel.player1Id, date);
  const player2Completed = await checkDailyCompletion(duel.player2Id, date);

  let player1Damage = 0;
  let player2Damage = 0;
  let player1NewHP = duel.player1HP;
  let player2NewHP = duel.player2HP;

  // Aplicar daño si no completaron
  if (!player1Completed) {
    player1Damage = HP_LOSS_PER_FAILURE;
    player1NewHP = Math.max(0, duel.player1HP - player1Damage);
  }

  if (!player2Completed) {
    player2Damage = HP_LOSS_PER_FAILURE;
    player2NewHP = Math.max(0, duel.player2HP - player2Damage);
  }

  // Actualizar HP en el duelo
  await prisma.arenaDuel.update({
    where: { id: duelId },
    data: {
      player1HP: player1NewHP,
      player2HP: player2NewHP,
    },
  });

  // Crear registro diario
  await prisma.arenaDailyUpdate.create({
    data: {
      duelId,
      date,
      player1HP: player1NewHP,
      player2HP: player2NewHP,
      player1Damage,
      player2Damage,
      player1Failed: !player1Completed,
      player2Failed: !player2Completed,
    },
  });

  console.log(
    `[ARENA] Duelo ${duelId} - HP actualizado | P1: ${player1NewHP} HP | P2: ${player2NewHP} HP`
  );

  // Verificar Muerte Súbita (K.O. antes del domingo)
  if (player1NewHP === 0 || player2NewHP === 0) {
    await resolveEarlyKO(duelId);
  }
}

/**
 * Resolver K.O. anticipado (antes del domingo)
 */
async function resolveEarlyKO(duelId: number) {
  const duel = await prisma.arenaDuel.findUnique({
    where: { id: duelId },
  });

  if (!duel) return;

  let winnerId: number;
  let resolutionType: ResolutionType = 'WIN';

  if (duel.player1HP > duel.player2HP) {
    winnerId = duel.player1Id;
  } else if (duel.player2HP > duel.player1HP) {
    winnerId = duel.player2Id;
  } else {
    // Empate en 0 HP = Doble K.O.
    await resolveDoubleKO(duelId);
    return;
  }

  // Winner takes all
  await prisma.$transaction(async (tx) => {
    // Dar el premio al ganador
    await tx.usuario.update({
      where: { id: winnerId },
      data: { puntosGamificacion: { increment: duel.escrowTotal } },
    });

    // Actualizar duelo
    await tx.arenaDuel.update({
      where: { id: duelId },
      data: {
        status: 'COMPLETED',
        winnerId,
        prize: duel.escrowTotal,
        resolvedAt: new Date(),
        resolutionType: 'WIN',
      },
    });

    // Actualizar estadísticas
    await updateStats(tx, duel.player1Id, duel.player2Id, winnerId, duel.escrowTotal);
  });

  console.log(`[ARENA] Duelo ${duelId} resuelto por K.O. anticipado | Ganador: ${winnerId}`);
}

/**
 * Resolver duelo el Domingo (Cron Job)
 */
export async function resolveSundayDuels() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Buscar duelos que terminan hoy
  const duels = await prisma.arenaDuel.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  });

  console.log(`[ARENA] Resolviendo ${duels.length} duelos del domingo...`);

  for (const duel of duels) {
    await resolveDuel(duel.id);
  }
}

/**
 * Resolver un duelo individual
 */
async function resolveDuel(duelId: number) {
  const duel = await prisma.arenaDuel.findUnique({
    where: { id: duelId },
  });

  if (!duel) return;

  // Calcular cumplimiento semanal de ambos jugadores
  const player1Completion = await calculateWeeklyCompletion(duel.player1Id, duel.startDate, duel.endDate);
  const player2Completion = await calculateWeeklyCompletion(duel.player2Id, duel.startDate, duel.endDate);

  // Actualizar métricas en el duelo
  await prisma.arenaDuel.update({
    where: { id: duelId },
    data: {
      player1Completion,
      player2Completion,
    },
  });

  // ESCENARIO A: Empate de Titanes (ambos >0 HP y similares)
  const hpDiff = Math.abs(duel.player1HP - duel.player2HP);
  if (duel.player1HP > 0 && duel.player2HP > 0 && hpDiff < 20) {
    await resolveTie(duelId);
    return;
  }

  // ESCENARIO C: Doble K.O. (ambos <50% cumplimiento)
  if (player1Completion < BURN_THRESHOLD && player2Completion < BURN_THRESHOLD) {
    await resolveDoubleKO(duelId);
    return;
  }

  // ESCENARIO B: Winner Takes All
  const winnerId = player1Completion > player2Completion ? duel.player1Id : duel.player2Id;

  await prisma.$transaction(async (tx) => {
    // Dar el premio al ganador
    await tx.usuario.update({
      where: { id: winnerId },
      data: { puntosGamificacion: { increment: duel.escrowTotal } },
    });

    // Actualizar duelo
    await tx.arenaDuel.update({
      where: { id: duelId },
      data: {
        status: 'COMPLETED',
        winnerId,
        prize: duel.escrowTotal,
        resolvedAt: new Date(),
        resolutionType: 'WIN',
      },
    });

    // Actualizar estadísticas
    await updateStats(tx, duel.player1Id, duel.player2Id, winnerId, duel.escrowTotal);
  });

  console.log(`[ARENA] Duelo ${duelId} resuelto | Ganador: ${winnerId}`);
}

/**
 * Resolver empate (Refund + Bonus)
 */
async function resolveTie(duelId: number) {
  const duel = await prisma.arenaDuel.findUnique({
    where: { id: duelId },
  });

  if (!duel) return;

  await prisma.$transaction(async (tx) => {
    // Devolver apuesta + bonus a ambos
    await tx.usuario.update({
      where: { id: duel.player1Id },
      data: { puntosGamificacion: { increment: duel.betAmount + TIE_BONUS } },
    });

    await tx.usuario.update({
      where: { id: duel.player2Id },
      data: { puntosGamificacion: { increment: duel.betAmount + TIE_BONUS } },
    });

    // Actualizar duelo
    await tx.arenaDuel.update({
      where: { id: duelId },
      data: {
        status: 'COMPLETED',
        winnerId: null,
        prize: TIE_BONUS * 2,
        resolvedAt: new Date(),
        resolutionType: 'TIE',
      },
    });

    // Actualizar estadísticas (empate)
    await tx.arenaStats.update({
      where: { usuarioId: duel.player1Id },
      data: { ties: { increment: 1 } },
    });

    await tx.arenaStats.update({
      where: { usuarioId: duel.player2Id },
      data: { ties: { increment: 1 } },
    });
  });

  console.log(`[ARENA] Duelo ${duelId} resuelto | Empate de Titanes`);
}

/**
 * Resolver Doble K.O. (La casa gana - Burn)
 */
async function resolveDoubleKO(duelId: number) {
  const duel = await prisma.arenaDuel.findUnique({
    where: { id: duelId },
  });

  if (!duel) return;

  await prisma.$transaction(async (tx) => {
    // Los PC se queman (no se devuelven a nadie)
    await tx.arenaDuel.update({
      where: { id: duelId },
      data: {
        status: 'COMPLETED',
        winnerId: null,
        prize: 0,
        resolvedAt: new Date(),
        resolutionType: 'DOUBLE_KO',
      },
    });

    // Actualizar estadísticas (ambos pierden)
    await tx.arenaStats.update({
      where: { usuarioId: duel.player1Id },
      data: { losses: { increment: 1 }, totalLost: { increment: duel.betAmount } },
    });

    await tx.arenaStats.update({
      where: { usuarioId: duel.player2Id },
      data: { losses: { increment: 1 }, totalLost: { increment: duel.betAmount } },
    });
  });

  console.log(`[ARENA] Duelo ${duelId} resuelto | Doble K.O. - ${duel.escrowTotal} PC quemados`);
}

/**
 * Calcular % de cumplimiento semanal
 */
async function calculateWeeklyCompletion(usuarioId: number, startDate: Date, endDate: Date): Promise<number> {
  const tasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId,
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (tasks.length === 0) return 1.0; // 100% si no tiene tareas

  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  return completedTasks / tasks.length;
}

/**
 * Actualizar estadísticas de ambos jugadores
 */
async function updateStats(tx: any, player1Id: number, player2Id: number, winnerId: number, prize: number) {
  const loserId = winnerId === player1Id ? player2Id : player1Id;

  // Ganador
  await tx.arenaStats.update({
    where: { usuarioId: winnerId },
    data: {
      wins: { increment: 1 },
      totalWon: { increment: prize },
      netProfit: { increment: prize / 2 }, // Ganancia neta = premio - apuesta
      currentStreak: { increment: 1 },
      lastDuelAt: new Date(),
    },
  });

  // Actualizar mejor racha si es necesario
  const winnerStats = await tx.arenaStats.findUnique({
    where: { usuarioId: winnerId },
  });

  if (winnerStats && winnerStats.currentStreak > winnerStats.bestStreak) {
    await tx.arenaStats.update({
      where: { usuarioId: winnerId },
      data: { bestStreak: winnerStats.currentStreak },
    });
  }

  // Perdedor
  await tx.arenaStats.update({
    where: { usuarioId: loserId },
    data: {
      losses: { increment: 1 },
      totalLost: { increment: prize / 2 },
      netProfit: { decrement: prize / 2 },
      currentStreak: 0, // Resetear racha
      lastDuelAt: new Date(),
    },
  });
}
