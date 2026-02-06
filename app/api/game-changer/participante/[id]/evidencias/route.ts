import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const gameChangerId = session.user.id;
    const participanteId = parseInt(params.id);

    if (isNaN(participanteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que el Game Changer tiene acceso a este participante
    const participante = await prisma.visionParticipante.findFirst({
      where: {
        userId: participanteId,
        gameChangerId: gameChangerId
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            tier: true,
            nivelActual: true,
            rangoActual: true,
            experienciaXP: true,
            completionStreak: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    if (!participante) {
      return NextResponse.json(
        { error: 'No tienes acceso a este participante' },
        { status: 403 }
      );
    }

    // Obtener las evidencias del participante
    const evidencias = await prisma.taskEvidence.findMany({
      where: {
        userId: participanteId
      },
      include: {
        Task: {
          include: {
            Area: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    // Formatear las evidencias
    const evidenciasFormateadas = evidencias.map((e: any) => ({
      id: e.id,
      description: e.description,
      evidenceUrl: e.evidenceUrl,
      status: e.status,
      submittedAt: e.submittedAt.toISOString(),
      reviewedAt: e.reviewedAt?.toISOString() || null,
      reviewComment: e.reviewComment,
      areaName: e.Task.Area.name,
      taskTitle: e.Task.title,
      weekNumber: e.Task.weekNumber
    }));

    return NextResponse.json({
      participante: {
        id: participante.User.id,
        nombre: participante.User.name,
        email: participante.User.email,
        profileImage: participante.User.profileImage,
        tier: participante.User.tier,
        nivelActual: participante.User.nivelActual,
        rangoActual: participante.User.rangoActual,
        experienciaXP: participante.User.experienciaXP,
        completionStreak: participante.User.completionStreak,
        visionNombre: participante.Vision.nombre
      },
      evidencias: evidenciasFormateadas
    });
  } catch (error) {
    logger.error('Error en /api/game-changer/participante/[id]/evidencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener las evidencias' },
      { status: 500 }
    );
  }
}
