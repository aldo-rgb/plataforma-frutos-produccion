import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Asignar Game Changer a Participante
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'COORDINADOR') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const { participanteId, gameChangerId } = await request.json();

    if (isNaN(visionId) || !participanteId) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Verificar que la visión pertenece a la organización del coordinador
    const coordinador = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!coordinador?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes organización asignada' },
        { status: 400 }
      );
    }

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision || vision.coordinadorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Si gameChangerId es null, estamos removiendo la asignación
    if (gameChangerId === null) {
      await prisma.visionParticipante.updateMany({
        where: {
          visionId,
          participanteId,
        },
        data: {
          gameChangerId: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Game Changer removido del participante',
      });
    }

    // Verificar que el Game Changer existe y está en la visión
    const gameChangerInVision = await prisma.visionGameChanger.findFirst({
      where: {
        visionId,
        gameChangerId,
      },
    });

    if (!gameChangerInVision) {
      return NextResponse.json(
        { success: false, error: 'El Game Changer no está en esta visión' },
        { status: 400 }
      );
    }

    // Actualizar la asignación
    await prisma.visionParticipante.updateMany({
      where: {
        visionId,
        participanteId,
      },
      data: {
        gameChangerId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Game Changer asignado exitosamente',
    });
  } catch (error) {
    logger.error('Error assigning game changer:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar Game Changer' },
      { status: 500 }
    );
  }
}
