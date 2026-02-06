import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/tareas/complete-simple
 * Completa una tarea sin evidencia (como las de arquetipo)
 * Solo funciona para tareas que no requieren evidencia
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id) 
      : session.user.id;
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'Se requiere submissionId' }, { status: 400 });
    }

    // Obtener la submission con su AdminTask
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        AdminTask: true
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    // Verificar que la tarea pertenece al usuario
    if (submission.usuarioId !== userId) {
      return NextResponse.json({ error: 'No autorizado para esta tarea' }, { status: 403 });
    }

    // Verificar que la tarea no requiere evidencia
    if (submission.AdminTask.requiereEvidencia) {
      return NextResponse.json({ 
        error: 'Esta tarea requiere evidencia. Usa el endpoint de upload de evidencia.' 
      }, { status: 400 });
    }

    // Verificar que la tarea está pendiente
    if (submission.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Esta tarea ya fue completada o expiró',
        currentStatus: submission.status
      }, { status: 400 });
    }

    // Completar la tarea y dar los puntos
    const pointsReward = submission.AdminTask.pointsReward || 0;

    const [updatedSubmission] = await prisma.$transaction([
      // Actualizar la submission a APPROVED
      prisma.taskSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'APPROVED',
          puntosGanados: pointsReward,
          submittedAt: new Date(),
          reviewedAt: new Date() // Auto-aprobada
        }
      }),
      // Incrementar puntos del usuario
      prisma.usuario.update({
        where: { id: userId },
        data: {
          puntosCuanticos: { increment: pointsReward }
        }
      })
    ]);

    // Si es tarea de arquetipo, actualizar el status de la asignación
    if (submission.AdminTask.type === 'ARCHETYPE_REVIEW') {
      // Buscar la asignación relacionada por el targetId
      const targetId = submission.AdminTask.targetId;
      if (targetId === userId) {
        // Buscar la asignación más reciente del usuario
        await prisma.archetypeAssignment.updateMany({
          where: {
            participantId: userId,
            status: 'SENT'
          },
          data: {
            status: 'VIEWED',
            viewedAt: new Date()
          }
        });
      }
    }

    // Si es tarea de metamorfosis, actualizar el status de la asignación
    if (submission.AdminTask.type === 'METAMORFOSIS_REVIEW') {
      const targetId = submission.AdminTask.targetId;
      if (targetId === userId) {
        await prisma.metamorfosisAssignment.updateMany({
          where: {
            participantId: userId,
            status: 'SENT'
          },
          data: {
            status: 'VIEWED',
            viewedAt: new Date()
          }
        });
      }
    }

    logger.debug(`✅ Tarea ${submissionId} completada por usuario ${userId}. Puntos: +${pointsReward}`);

    return NextResponse.json({
      success: true,
      message: `¡Tarea completada! +${pointsReward} puntos`,
      pointsEarned: pointsReward,
      submission: updatedSubmission
    });

  } catch (error: any) {
    logger.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Error al completar la tarea', details: error.message },
      { status: 500 }
    );
  }
}
