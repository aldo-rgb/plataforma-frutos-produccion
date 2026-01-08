import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const { trackingId, callResult, comments } = body;

    // Crear log de interacción
    const interaction = await prisma.callInteractionLog.create({
      data: {
        trackingId,
        coordinatorId: parseInt(session.user.id),
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

    // Actualizar el tracking con la última interacción y contador de intentos
    await prisma.basicCallTracking.update({
      where: { id: trackingId },
      data: {
        lastInteractionAt: new Date(),
        callAttempts: {
          increment: 1,
        },
        // Si confirmó asistencia, actualizar status
        ...(callResult === 'CONFIRMED' && {
          attendanceStatus: 'ASISTE',
        }),
      },
    });

    return NextResponse.json(interaction);
  } catch (error) {
    console.error('Error creating call interaction:', error);
    return NextResponse.json(
      { error: 'Error al registrar interacción' },
      { status: 500 }
    );
  }
}
