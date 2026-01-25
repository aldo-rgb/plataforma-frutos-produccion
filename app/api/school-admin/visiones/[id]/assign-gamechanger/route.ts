import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

// POST - Asignar Game Changer a Participante
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ALLOWED_ROLES.includes(session.user.rol as string)) {
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

    // Verificar que la visión pertenece a la organización del director
    const director = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!director?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes organización asignada' },
        { status: 400 }
      );
    }

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision || vision.organizationId !== director.organizationId) {
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

    // Verificar si ya existe VisionParticipante para este usuario
    const existingVP = await prisma.visionParticipante.findFirst({
      where: {
        visionId,
        participanteId,
      },
    });

    if (existingVP) {
      // Actualizar la asignación existente
      await prisma.visionParticipante.update({
        where: { id: existingVP.id },
        data: { gameChangerId },
      });
    } else {
      // Crear VisionParticipante si no existe (para usuarios que solo están en vision_enrollments)
      await prisma.visionParticipante.create({
        data: {
          visionId,
          participanteId,
          gameChangerId,
          asignadoPorId: session.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Game Changer asignado exitosamente',
    });
  } catch (error) {
    console.error('Error assigning game changer:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar Game Changer' },
      { status: 500 }
    );
  }
}
