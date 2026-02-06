import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

// POST: Registrar una interacción de llamada
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { trackingId, callResult, comments, attendanceStatus } = body;
    const coordinatorId = parseInt(session.user.id);

    // Crear log de interacción
    const interaction = await prisma.callInteractionLog.create({
      data: {
        trackingId,
        coordinatorId,
        callResult,
        comments,
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Preparar datos de actualización
    const updateData: any = {
      lastInteractionAt: new Date(),
      callAttempts: { increment: 1 },
      coordinatorId, // Asignar coordinador para seguimiento
    };

    // Solo cambiar attendanceStatus en casos específicos:
    // - CONFIRMED → ASISTE
    // - RESCHEDULED → PENDING (viene en attendanceStatus)
    if (callResult === 'CONFIRMED') {
      updateData.attendanceStatus = 'ASISTE';
    } else if (attendanceStatus) {
      updateData.attendanceStatus = attendanceStatus;
    }
    // Para ANSWERED, VOICEMAIL, NO_ANSWER → mantener PENDING (no cambiar)

    // Actualizar el tracking
    await prisma.basicCallTracking.update({
      where: { id: trackingId },
      data: updateData,
    });

    return NextResponse.json(interaction);
  } catch (error) {
    logger.error('Error creating call interaction:', error);
    return NextResponse.json(
      { error: 'Error al registrar interacción' },
      { status: 500 }
    );
  }
}
