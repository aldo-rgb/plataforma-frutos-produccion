/**
 * ⚔️ QUANTUM ARENA - Motor de Emparejamiento
 * Busca rivales automáticamente basado en nivel y zona horaria
 */

import { prisma } from '@/lib/prisma';
import { QueueStatus, DuelStatus } from '@prisma/client';

const BET_AMOUNT = 500; // PC requeridos para entrar al Arena
const QUEUE_EXPIRATION_HOURS = 24;

interface MatchResult {
  success: boolean;
  duelId?: number;
  message: string;
  rival?: {
    id: number;
    nombre: string;
    nivel: string;
    avatar?: string;
  };
}

/**
 * Buscar partido (Matchmaking)
 * Valida fondos, busca rival con mismo nivel
 */
export async function searchMatch(usuarioId: number): Promise<MatchResult> {
  // 1. Validar usuario
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      nombre: true,
      puntosGamificacion: true,
      rangoActual: true,
      timezone: true,
      ArenaQueue: true,
    },
  });

  if (!usuario) {
    return { success: false, message: 'Usuario no encontrado' };
  }

  // 2. Validar fondos suficientes
  if (usuario.puntosGamificacion < BET_AMOUNT) {
    return {
      success: false,
      message: `Fondos insuficientes. Necesitas ${BET_AMOUNT} PC (tienes ${usuario.puntosGamificacion} PC)`,
    };
  }

  // 3. Validar que no esté ya en cola
  if (usuario.ArenaQueue) {
    return {
      success: false,
      message: 'Ya estás en la cola de búsqueda',
    };
  }

  // 4. Verificar que no tenga duelo activo
  const activeDuel = await prisma.arenaDuel.findFirst({
    where: {
      OR: [{ player1Id: usuarioId }, { player2Id: usuarioId }],
      status: 'ACTIVE',
    },
  });

  if (activeDuel) {
    return {
      success: false,
      message: 'Ya tienes un duelo activo. Termínalo antes de buscar otro.',
    };
  }

  // 5. Buscar rival en la cola
  const rival = await findRival(usuario.rangoActual, usuario.timezone, usuarioId);

  if (rival) {
    // ¡Match encontrado! Crear duelo
    const duel = await createDuel(usuarioId, rival.id);
    
    // Eliminar ambos de la cola
    await prisma.arenaQueue.deleteMany({
      where: {
        usuarioId: { in: [usuarioId, rival.id] },
      },
    });

    const rivalData = await prisma.usuario.findUnique({
      where: { id: rival.id },
      select: { nombre: true, rangoActual: true, profileImage: true },
    });

    return {
      success: true,
      duelId: duel.id,
      message: '¡Rival encontrado! El duelo comienza ahora.',
      rival: {
        id: rival.id,
        nombre: rivalData?.nombre || 'Rival',
        nivel: rivalData?.rangoActual || 'DESCONOCIDO',
        avatar: rivalData?.profileImage || undefined,
      },
    };
  } else {
    // No hay rival disponible, agregar a cola
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + QUEUE_EXPIRATION_HOURS);

    await prisma.arenaQueue.create({
      data: {
        usuarioId,
        userLevel: usuario.rangoActual,
        timezone: usuario.timezone,
        pcBalance: usuario.puntosGamificacion,
        status: 'SEARCHING',
        expiresAt,
      },
    });

    return {
      success: true,
      message: 'Buscando rival... Te notificaremos cuando encontremos uno.',
    };
  }
}

/**
 * Buscar rival en la cola
 * Criterio 1: Mismo nivel (equidad)
 * Criterio 2: Zona horaria similar (opcional)
 */
async function findRival(userLevel: string, timezone: string, excludeUserId: number) {
  // Primero intentar con mismo nivel y timezone
  let rival = await prisma.arenaQueue.findFirst({
    where: {
      status: 'SEARCHING',
      userLevel,
      timezone,
      usuarioId: { not: excludeUserId },
    },
    orderBy: { enteredAt: 'asc' }, // El que lleva más tiempo esperando
  });

  // Si no hay, buscar solo por nivel (ignorar timezone)
  if (!rival) {
    rival = await prisma.arenaQueue.findFirst({
      where: {
        status: 'SEARCHING',
        userLevel,
        usuarioId: { not: excludeUserId },
      },
      orderBy: { enteredAt: 'asc' },
    });
  }

  return rival;
}

/**
 * Crear duelo y bloquear fondos (Escrow)
 */
async function createDuel(player1Id: number, player2Id: number) {
  const now = new Date();
  
  // Calcular inicio y fin del duelo (Lunes 00:00 a Domingo 23:59)
  const startDate = getNextMonday(now);
  const endDate = getFollowingSunday(startDate);

  // Transacción atómica
  const duel = await prisma.$transaction(async (tx) => {
    // 1. Descontar PC de ambos usuarios
    await tx.usuario.update({
      where: { id: player1Id },
      data: { puntosGamificacion: { decrement: BET_AMOUNT } },
    });

    await tx.usuario.update({
      where: { id: player2Id },
      data: { puntosGamificacion: { decrement: BET_AMOUNT } },
    });

    // 2. Crear el duelo
    const newDuel = await tx.arenaDuel.create({
      data: {
        player1Id,
        player2Id,
        status: 'ACTIVE',
        betAmount: BET_AMOUNT,
        escrowTotal: BET_AMOUNT * 2,
        startDate,
        endDate,
        player1HP: 100,
        player2HP: 100,
      },
    });

    // 3. Inicializar estadísticas si no existen
    await tx.arenaStats.upsert({
      where: { usuarioId: player1Id },
      create: { usuarioId: player1Id, totalDuels: 1, totalWagered: BET_AMOUNT },
      update: { totalDuels: { increment: 1 }, totalWagered: { increment: BET_AMOUNT } },
    });

    await tx.arenaStats.upsert({
      where: { usuarioId: player2Id },
      create: { usuarioId: player2Id, totalDuels: 1, totalWagered: BET_AMOUNT },
      update: { totalDuels: { increment: 1 }, totalWagered: { increment: BET_AMOUNT } },
    });

    return newDuel;
  });

  console.log(`[ARENA] Duelo creado: ${duel.id} | Player1: ${player1Id} vs Player2: ${player2Id}`);
  return duel;
}

/**
 * Cancelar búsqueda y salir de la cola
 */
export async function cancelSearch(usuarioId: number): Promise<{ success: boolean; message: string }> {
  const queueEntry = await prisma.arenaQueue.findUnique({
    where: { usuarioId },
  });

  if (!queueEntry) {
    return { success: false, message: 'No estás en la cola de búsqueda' };
  }

  await prisma.arenaQueue.delete({
    where: { usuarioId },
  });

  return { success: true, message: 'Búsqueda cancelada' };
}

/**
 * Obtener próximo Lunes
 */
function getNextMonday(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Domingo
  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtener el Domingo siguiente al Lunes dado
 */
function getFollowingSunday(monday: Date): Date {
  const result = new Date(monday);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Limpiar colas expiradas (Job diario)
 */
export async function cleanExpiredQueues() {
  const now = new Date();
  const deleted = await prisma.arenaQueue.deleteMany({
    where: {
      expiresAt: { lt: now },
      status: 'SEARCHING',
    },
  });

  console.log(`[ARENA] Limpieza de colas: ${deleted.count} entradas eliminadas`);
  return deleted.count;
}
