import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ADMIN_ROLES = ['TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * GET /api/gc-calls/dashboard
 * Dashboard para coordinadores y trainers
 * Query: visionId, date?, view (semaforo|rescate|avance)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || !ADMIN_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const view = searchParams.get('view') || 'semaforo';
    const trainingType = searchParams.get('trainingType') || 'BASIC';
    const level = searchParams.get('level');

    if (!visionId) {
      return NextResponse.json({ success: false, error: 'visionId requerido' }, { status: 400 });
    }

    const visionIdNum = parseInt(visionId);

    // Verificar acceso a la visión
    const vision = await prisma.vision.findUnique({
      where: { id: visionIdNum },
      select: { organizationId: true, nombre: true },
    });

    if (!vision || vision.organizationId !== user.organizationId) {
      return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });
    }

    // Según la vista solicitada
    switch (view) {
      case 'semaforo':
        return await getSemaforoView(visionIdNum, trainingType, level);
      case 'rescate':
        return await getRescateView(visionIdNum, trainingType);
      case 'avance':
        return await getAvanceView(visionIdNum);
      case 'agenda':
        return await getAgendaView(visionIdNum, searchParams.get('date'));
      default:
        return NextResponse.json({ success: false, error: 'Vista no válida' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * Vista 1: Semaforización de Squads
 * Muestra promedio de calificación por squad
 */
async function getSemaforoView(visionId: number, trainingType: string, level: string | null) {
  // Obtener todos los squads de la visión
  const squads = await prisma.smallGroup.findMany({
    where: {
      visionId,
      isActive: true,
      ...(level && { level: level as any }),
    },
    include: {
      leader: { select: { id: true, nombre: true, imagen: true } },
      members: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  // Para cada squad, calcular estadísticas de llamadas
  const squadStats = await Promise.all(squads.map(async (squad) => {
    const memberIds = squad.members.map(m => m.userId);

    // Obtener logs de llamadas de los miembros
    const callLogs = await prisma.gCCallLog.findMany({
      where: {
        participantId: { in: memberIds },
        visionId,
        trainingType: trainingType as any,
      },
      select: {
        participantId: true,
        callStatus: true,
        potentialRating: true,
        trainingDay: true,
        isAtRisk: true,
      },
    });

    // Calcular métricas
    const totalCalls = callLogs.length;
    const answeredCalls = callLogs.filter(l => l.callStatus === 'ANSWERED').length;
    const ratings = callLogs.filter(l => l.potentialRating).map(l => l.potentialRating!);
    const avgRating = ratings.length > 0 
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;
    const atRiskCount = callLogs.filter(l => l.isAtRisk).length;

    // Determinar color del semáforo
    let status: 'green' | 'yellow' | 'red' = 'green';
    if (avgRating <= 2 || atRiskCount > squad.members.length / 2) {
      status = 'red';
    } else if (avgRating <= 3 || atRiskCount > squad.members.length / 4) {
      status = 'yellow';
    }

    return {
      id: squad.id,
      name: squad.name,
      level: squad.level,
      leader: squad.leader,
      membersCount: squad.members.length,
      stats: {
        totalCalls,
        answeredCalls,
        answerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
        avgRating,
        atRiskCount,
        status,
      },
    };
  }));

  // Ordenar por status (red primero) y luego por rating
  squadStats.sort((a, b) => {
    const statusOrder = { red: 0, yellow: 1, green: 2 };
    if (statusOrder[a.stats.status] !== statusOrder[b.stats.status]) {
      return statusOrder[a.stats.status] - statusOrder[b.stats.status];
    }
    return a.stats.avgRating - b.stats.avgRating;
  });

  return NextResponse.json({
    success: true,
    view: 'semaforo',
    squads: squadStats,
    summary: {
      totalSquads: squadStats.length,
      redSquads: squadStats.filter(s => s.stats.status === 'red').length,
      yellowSquads: squadStats.filter(s => s.stats.status === 'yellow').length,
      greenSquads: squadStats.filter(s => s.stats.status === 'green').length,
    },
  });
}

/**
 * Vista 2: Lista de Rescate
 * Participantes en riesgo que necesitan intervención
 */
async function getRescateView(visionId: number, trainingType: string) {
  // Participantes con:
  // - No contestó en el último día
  // - Calificación 1 o 2
  // - requiresIntervention = true
  const atRiskLogs = await prisma.gCCallLog.findMany({
    where: {
      visionId,
      trainingType: trainingType as any,
      OR: [
        { isAtRisk: true },
        { requiresIntervention: true },
        { callStatus: 'NO_ANSWER' },
        { potentialRating: { lte: 2 } },
      ],
    },
    include: {
      participant: {
        select: { id: true, nombre: true, telefono: true, imagen: true },
      },
      gameChanger: {
        select: { id: true, nombre: true },
      },
      squad: {
        select: { id: true, name: true },
      },
      interventions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [
      { requiresIntervention: 'desc' },
      { potentialRating: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Agrupar por participante (tomar el log más reciente)
  const participantMap = new Map<number, typeof atRiskLogs[0]>();
  atRiskLogs.forEach(log => {
    if (!participantMap.has(log.participantId)) {
      participantMap.set(log.participantId, log);
    }
  });

  const rescueList = Array.from(participantMap.values()).map(log => ({
    id: log.id,
    participant: log.participant,
    gameChanger: log.gameChanger,
    squad: log.squad,
    trainingDay: log.trainingDay,
    callStatus: log.callStatus,
    potentialRating: log.potentialRating,
    riskReason: log.riskReason,
    notes: log.notes,
    requiresIntervention: log.requiresIntervention,
    hasIntervention: log.interventions.length > 0,
    lastIntervention: log.interventions[0] || null,
    createdAt: log.createdAt,
  }));

  return NextResponse.json({
    success: true,
    view: 'rescate',
    participants: rescueList,
    summary: {
      total: rescueList.length,
      needsImmediate: rescueList.filter(p => p.requiresIntervention && !p.hasIntervention).length,
      noAnswer: rescueList.filter(p => p.callStatus === 'NO_ANSWER').length,
      lowPotential: rescueList.filter(p => p.potentialRating && p.potentialRating <= 2).length,
    },
  });
}

/**
 * Vista 3: Avance a Avanzado
 * Participantes de básico con promedio 4-5, listos para avanzado
 */
async function getAvanceView(visionId: number) {
  // Solo para entrenamiento básico, participantes con rating promedio >= 4
  const highPotentialLogs = await prisma.gCCallLog.groupBy({
    by: ['participantId'],
    where: {
      visionId,
      trainingType: 'BASIC',
      potentialRating: { gte: 4 },
    },
    _avg: {
      potentialRating: true,
    },
    _count: {
      potentialRating: true,
    },
    having: {
      potentialRating: {
        _avg: {
          gte: 4,
        },
      },
    },
  });

  // Obtener detalles de estos participantes
  const participantIds = highPotentialLogs.map(l => l.participantId);

  const participants = await prisma.usuario.findMany({
    where: { id: { in: participantIds } },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      email: true,
      imagen: true,
    },
  });

  // Obtener el último log de cada participante
  const lastLogs = await prisma.gCCallLog.findMany({
    where: {
      participantId: { in: participantIds },
      visionId,
      trainingType: 'BASIC',
    },
    include: {
      gameChanger: { select: { nombre: true } },
      squad: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const lastLogMap = new Map<number, typeof lastLogs[0]>();
  lastLogs.forEach(log => {
    if (!lastLogMap.has(log.participantId)) {
      lastLogMap.set(log.participantId, log);
    }
  });

  const advanceList = participants.map(p => {
    const stats = highPotentialLogs.find(l => l.participantId === p.id);
    const lastLog = lastLogMap.get(p.id);
    
    return {
      participant: p,
      avgRating: stats?._avg.potentialRating ? Math.round(stats._avg.potentialRating * 10) / 10 : 0,
      callsCount: stats?._count.potentialRating || 0,
      lastNote: lastLog?.notes,
      gameChanger: lastLog?.gameChanger?.nombre,
      squad: lastLog?.squad?.name,
      commitment: lastLog?.commitment,
    };
  });

  // Ordenar por rating promedio descendente
  advanceList.sort((a, b) => b.avgRating - a.avgRating);

  return NextResponse.json({
    success: true,
    view: 'avance',
    participants: advanceList,
    summary: {
      total: advanceList.length,
      rating5: advanceList.filter(p => p.avgRating >= 5).length,
      rating4: advanceList.filter(p => p.avgRating >= 4 && p.avgRating < 5).length,
    },
  });
}

/**
 * Vista 4: Agenda del día
 * Todas las llamadas programadas para una fecha
 */
async function getAgendaView(visionId: number, dateStr: string | null) {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Obtener squads de la visión
  const squads = await prisma.smallGroup.findMany({
    where: { visionId, isActive: true },
    select: { id: true, leaderId: true },
  });

  const squadIds = squads.map(s => s.id);

  // Obtener slots agendados para hoy
  const slots = await prisma.gCCallSlot.findMany({
    where: {
      squadId: { in: squadIds },
      scheduledDate: targetDate,
      status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
    },
    include: {
      participant: {
        select: { id: true, nombre: true, telefono: true, imagen: true },
      },
      availability: {
        include: {
          gameChanger: { select: { id: true, nombre: true, imagen: true } },
        },
      },
      squad: {
        select: { id: true, name: true },
      },
      callLog: {
        select: {
          callStatus: true,
          potentialRating: true,
          notes: true,
        },
      },
    },
    orderBy: [{ scheduledTime: 'asc' }],
  });

  // Agrupar por GC
  const byGameChanger: Record<number, typeof slots> = {};
  slots.forEach(slot => {
    const gcId = slot.availability.gameChangerId;
    if (!byGameChanger[gcId]) {
      byGameChanger[gcId] = [];
    }
    byGameChanger[gcId].push(slot);
  });

  const agenda = Object.entries(byGameChanger).map(([gcId, gcSlots]) => {
    const gc = gcSlots[0].availability.gameChanger;
    return {
      gameChanger: gc,
      slots: gcSlots.map(s => ({
        id: s.id,
        time: s.scheduledTime,
        endTime: s.endTime,
        participant: s.participant,
        squad: s.squad,
        status: s.status,
        hasLog: !!s.callLog,
        callLog: s.callLog,
      })),
      stats: {
        total: gcSlots.length,
        completed: gcSlots.filter(s => s.status === 'COMPLETED').length,
        pending: gcSlots.filter(s => s.status === 'SCHEDULED' || s.status === 'CONFIRMED').length,
        noShow: gcSlots.filter(s => s.status === 'NO_SHOW').length,
      },
    };
  });

  return NextResponse.json({
    success: true,
    view: 'agenda',
    date: targetDate.toISOString().split('T')[0],
    gameChangers: agenda,
    summary: {
      totalSlots: slots.length,
      completed: slots.filter(s => s.status === 'COMPLETED').length,
      pending: slots.filter(s => s.status === 'SCHEDULED' || s.status === 'CONFIRMED').length,
      gameChangersCount: Object.keys(byGameChanger).length,
    },
  });
}
