import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const GC_ROLES = ['GAMECHANGER', 'TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * GET /api/gc-calls/log
 * Obtener logs de llamadas
 * Query: squadId?, date?, participantId?, gameChangerId?
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const squadId = searchParams.get('squadId');
    const date = searchParams.get('date');
    const participantId = searchParams.get('participantId');
    const gameChangerId = searchParams.get('gameChangerId');
    const visionId = searchParams.get('visionId');
    const trainingDay = searchParams.get('trainingDay');
    const isAtRisk = searchParams.get('isAtRisk');

    // Construir filtros
    const where: any = {};

    // Si es GC solo puede ver sus propios logs
    if (user.rol === 'GAMECHANGER') {
      where.gameChangerId = user.id;
    } else if (gameChangerId) {
      where.gameChangerId = parseInt(gameChangerId);
    }

    if (squadId) where.squadId = squadId;
    if (participantId) where.participantId = parseInt(participantId);
    if (visionId) where.visionId = parseInt(visionId);
    if (trainingDay) where.trainingDay = parseInt(trainingDay);
    if (isAtRisk === 'true') where.isAtRisk = true;

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.createdAt = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    const logs = await prisma.gCCallLog.findMany({
      where,
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
        slot: {
          select: { scheduledDate: true, scheduledTime: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        participant: log.participant,
        gameChanger: log.gameChanger,
        squad: log.squad,
        trainingType: log.trainingType,
        trainingDay: log.trainingDay,
        callStatus: log.callStatus,
        potentialRating: log.potentialRating,
        commitment: log.commitment,
        notes: log.notes,
        isAtRisk: log.isAtRisk,
        riskReason: log.riskReason,
        requiresIntervention: log.requiresIntervention,
        scheduledDate: log.slot?.scheduledDate,
        scheduledTime: log.slot?.scheduledTime,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/gc-calls/log
 * Registrar log de llamada (formulario del GC)
 * Body: { slotId, callStatus, potentialRating?, commitment?, notes?, trainingDay, trainingType }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user || !GC_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    const body = await request.json();
    const {
      slotId,
      callStatus,
      potentialRating,
      commitment,
      notes,
      trainingDay,
      trainingType,
      callStartedAt,
      callEndedAt,
    } = body;

    if (!slotId || !callStatus || !trainingDay || !trainingType) {
      return NextResponse.json({
        success: false,
        error: 'slotId, callStatus, trainingDay y trainingType son requeridos',
      }, { status: 400 });
    }

    // Obtener el slot y verificar que pertenece al GC
    const slot = await prisma.gCCallSlot.findUnique({
      where: { id: slotId },
      include: {
        availability: {
          include: {
            squad: { select: { visionId: true } },
          },
        },
        participant: { select: { id: true, nombre: true } },
      },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot no encontrado' }, { status: 404 });
    }

    if (slot.availability.gameChangerId !== user.id && !['TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR'].includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Verificar si ya existe un log para este slot
    const existingLog = await prisma.gCCallLog.findUnique({
      where: { slotId },
    });

    if (existingLog) {
      return NextResponse.json({
        success: false,
        error: 'Ya existe un registro para esta llamada',
      }, { status: 409 });
    }

    // Determinar si está en riesgo
    const isAtRisk = 
      callStatus === 'NO_ANSWER' || 
      callStatus === 'WRONG_NUMBER' ||
      (potentialRating && potentialRating <= 2);

    const requiresIntervention = 
      potentialRating === 1 || 
      callStatus === 'WRONG_NUMBER';

    let riskReason: string | null = null;
    if (isAtRisk) {
      if (callStatus === 'NO_ANSWER') riskReason = 'No contestó la llamada';
      else if (callStatus === 'WRONG_NUMBER') riskReason = 'Número equivocado';
      else if (potentialRating && potentialRating <= 2) riskReason = 'Bajo potencial de continuar';
    }

    // Calcular duración si se proporcionaron tiempos
    let duration: number | null = null;
    if (callStartedAt && callEndedAt) {
      duration = Math.round((new Date(callEndedAt).getTime() - new Date(callStartedAt).getTime()) / 1000);
    }

    // Obtener visionId del squad o del slot
    const visionId = slot.squadId 
      ? (await prisma.smallGroup.findUnique({ where: { id: slot.squadId }, select: { visionId: true } }))?.visionId
      : slot.availability.squad?.visionId;

    if (!visionId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo determinar la visión',
      }, { status: 400 });
    }

    // Crear el log
    const log = await prisma.gCCallLog.create({
      data: {
        slotId,
        gameChangerId: user.id,
        participantId: slot.participantId,
        squadId: slot.squadId,
        visionId,
        trainingType,
        trainingDay: parseInt(trainingDay),
        callStatus,
        callStartedAt: callStartedAt ? new Date(callStartedAt) : null,
        callEndedAt: callEndedAt ? new Date(callEndedAt) : null,
        duration,
        potentialRating: potentialRating ? parseInt(potentialRating) : null,
        commitment: commitment || null,
        notes: notes || null,
        isAtRisk,
        riskReason,
        requiresIntervention,
      },
      include: {
        participant: { select: { nombre: true } },
      },
    });

    // Actualizar el slot a COMPLETED
    await prisma.gCCallSlot.update({
      where: { id: slotId },
      data: { status: 'COMPLETED' },
    });

    return NextResponse.json({
      success: true,
      message: `Llamada con ${slot.participant.nombre} registrada`,
      log: {
        id: log.id,
        participantName: log.participant.nombre,
        callStatus: log.callStatus,
        potentialRating: log.potentialRating,
        isAtRisk: log.isAtRisk,
      },
    });
  } catch (error) {
    console.error('Error creating call log:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/gc-calls/log
 * Actualizar un log existente
 * Query: id
 * Body: campos a actualizar
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user || !GC_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');

    if (!logId) {
      return NextResponse.json({ success: false, error: 'id requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { potentialRating, commitment, notes, followUpNeeded, followUpNote } = body;

    // Verificar que el log pertenece al GC
    const existingLog = await prisma.gCCallLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      return NextResponse.json({ success: false, error: 'Log no encontrado' }, { status: 404 });
    }

    if (existingLog.gameChangerId !== user.id && !['TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR'].includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Recalcular riesgo si se actualiza el rating
    const updatedData: any = {};
    if (potentialRating !== undefined) {
      updatedData.potentialRating = potentialRating;
      updatedData.isAtRisk = potentialRating <= 2;
      updatedData.requiresIntervention = potentialRating === 1;
      if (potentialRating <= 2) {
        updatedData.riskReason = 'Bajo potencial de continuar';
      }
    }
    if (commitment !== undefined) updatedData.commitment = commitment;
    if (notes !== undefined) updatedData.notes = notes;
    if (followUpNeeded !== undefined) updatedData.followUpNeeded = followUpNeeded;
    if (followUpNote !== undefined) updatedData.followUpNote = followUpNote;

    const log = await prisma.gCCallLog.update({
      where: { id: logId },
      data: updatedData,
    });

    return NextResponse.json({
      success: true,
      message: 'Log actualizado',
      log,
    });
  } catch (error) {
    console.error('Error updating call log:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
