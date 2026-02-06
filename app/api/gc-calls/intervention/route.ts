import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const TRAINER_ROLES = ['TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR'];

/**
 * POST /api/gc-calls/intervention
 * Registrar una intervención del trainer
 * Body: { callLogId, type, notes, actionTaken }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true },
    });

    if (!user || !TRAINER_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'Solo trainers pueden intervenir' }, { status: 403 });
    }

    const body = await request.json();
    const { callLogId, type, notes, actionTaken } = body;

    if (!callLogId || !type) {
      return NextResponse.json({
        success: false,
        error: 'callLogId y type son requeridos',
      }, { status: 400 });
    }

    // Verificar que el log existe
    const callLog = await prisma.gCCallLog.findUnique({
      where: { id: callLogId },
      include: {
        participant: { select: { nombre: true } },
      },
    });

    if (!callLog) {
      return NextResponse.json({ success: false, error: 'Log no encontrado' }, { status: 404 });
    }

    // Crear la intervención
    const intervention = await prisma.trainerIntervention.create({
      data: {
        callLogId,
        trainerId: user.id,
        type,
        notes: notes || null,
        actionTaken: actionTaken || null,
      },
    });

    // Marcar que ya tiene intervención
    await prisma.gCCallLog.update({
      where: { id: callLogId },
      data: { requiresIntervention: false },
    });

    return NextResponse.json({
      success: true,
      message: `Intervención registrada para ${callLog.participant.nombre}`,
      intervention: {
        id: intervention.id,
        type: intervention.type,
        createdAt: intervention.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating intervention:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * GET /api/gc-calls/intervention
 * Obtener intervenciones
 * Query: callLogId?, trainerId?, resolved?
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const callLogId = searchParams.get('callLogId');
    const trainerId = searchParams.get('trainerId');
    const resolved = searchParams.get('resolved');

    const where: any = {};
    if (callLogId) where.callLogId = callLogId;
    if (trainerId) where.trainerId = parseInt(trainerId);
    if (resolved === 'true') where.resolvedAt = { not: null };
    if (resolved === 'false') where.resolvedAt = null;

    const interventions = await prisma.trainerIntervention.findMany({
      where,
      include: {
        trainer: { select: { nombre: true } },
        callLog: {
          include: {
            participant: { select: { nombre: true, telefono: true } },
            gameChanger: { select: { nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      interventions: interventions.map(i => ({
        id: i.id,
        type: i.type,
        notes: i.notes,
        actionTaken: i.actionTaken,
        outcome: i.outcome,
        trainer: i.trainer.nombre,
        participant: i.callLog.participant.nombre,
        participantPhone: i.callLog.participant.telefono,
        gameChanger: i.callLog.gameChanger.nombre,
        createdAt: i.createdAt,
        resolvedAt: i.resolvedAt,
      })),
    });
  } catch (error) {
    logger.error('Error fetching interventions:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/gc-calls/intervention
 * Marcar intervención como resuelta
 * Query: id
 * Body: { outcome }
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

    if (!user || !TRAINER_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const interventionId = searchParams.get('id');

    if (!interventionId) {
      return NextResponse.json({ success: false, error: 'id requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { outcome } = body;

    const intervention = await prisma.trainerIntervention.update({
      where: { id: interventionId },
      data: {
        outcome: outcome || null,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Intervención marcada como resuelta',
      intervention,
    });
  } catch (error) {
    logger.error('Error updating intervention:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
