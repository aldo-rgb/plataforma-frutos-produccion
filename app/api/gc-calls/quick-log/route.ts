import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/gc-calls/quick-log
 * Registro rápido de intento de llamada con tracking múltiple
 * Permite registrar varios intentos por día
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const gc = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, organizationId: true },
    });

    if (!gc) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { participantId, completed, potentialRating, notes } = body;

    if (participantId === undefined || completed === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'participantId y completed son requeridos' 
      }, { status: 400 });
    }

    // Buscar si el participante está en algún squad del GC
    const membership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: parseInt(participantId),
        isActive: true,
        group: {
          leaderId: gc.id,
        },
      },
      include: {
        group: {
          select: { id: true, level: true, visionId: true },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false, 
        error: 'El participante no está en ninguno de tus grupos' 
      }, { status: 400 });
    }

    const squadId = membership.groupId;
    const visionId = membership.group.visionId;
    const trainingType = (membership.group.level as 'BASIC' | 'ADVANCED') || 'BASIC';

    // Calcular el día de entrenamiento
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { startDate: true, advancedStartDate: true },
    });

    let trainingDay = 1;
    if (vision) {
      const startDate = trainingType === 'ADVANCED' 
        ? vision.advancedStartDate 
        : vision.startDate;
      if (startDate) {
        const diffTime = Math.abs(new Date().getTime() - new Date(startDate).getTime());
        trainingDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (trainingDay < 1) trainingDay = 1;
      }
    }

    // Contar intentos previos del día para este participante
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const previousAttempts = await prisma.gCCallAttempt.count({
      where: {
        gameChangerId: gc.id,
        participantId: parseInt(participantId),
        attemptedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Crear nuevo intento de llamada
    const attempt = await prisma.gCCallAttempt.create({
      data: {
        gameChangerId: gc.id,
        participantId: parseInt(participantId),
        squadId,
        visionId,
        trainingType,
        trainingDay,
        attemptNumber: previousAttempts + 1,
        completed,
        potentialRating: potentialRating || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      attempt,
      message: completed 
        ? 'Llamada registrada exitosamente' 
        : `Intento #${previousAttempts + 1} registrado - No contestó`,
    });

  } catch (error) {
    console.error('Error saving call attempt:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

/**
 * GET /api/gc-calls/quick-log
 * Obtener historial de intentos de llamada para un participante
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const gc = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!gc) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');

    const where: any = {
      gameChangerId: gc.id,
    };

    if (participantId) {
      where.participantId = parseInt(participantId);
    }

    const attempts = await prisma.gCCallAttempt.findMany({
      where,
      orderBy: { attemptedAt: 'desc' },
      take: 50,
      include: {
        participant: {
          select: { id: true, nombre: true, imagen: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      attempts,
    });

  } catch (error) {
    console.error('Error fetching call attempts:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
