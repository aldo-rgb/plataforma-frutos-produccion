import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tareas/complete-without-evidence
 * Completa una tarea que no requiere evidencia
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { taskId, submissionId, tipo } = body;

    if (!taskId && !submissionId) {
      return NextResponse.json(
        { error: 'Se requiere taskId o submissionId' },
        { status: 400 }
      );
    }

    // ========== CASO 1: Tarea de CARTA (TaskInstance) ==========
    if (taskId && tipo === 'CARTA') {
      const task = await prisma.taskInstance.findUnique({
        where: { id: taskId },
        include: {
          Accion: true
        }
      });

      if (!task || task.usuarioId !== userId) {
        return NextResponse.json(
          { error: 'Tarea no encontrada o sin permisos' },
          { status: 404 }
        );
      }

      // Verificar que la tarea no requiera evidencia
      if (task.Accion?.requiereEvidencia) {
        return NextResponse.json(
          { error: 'Esta tarea requiere evidencia' },
          { status: 400 }
        );
      }

      // Completar la tarea
      await prisma.taskInstance.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      console.log(`✅ Tarea de carta ${taskId} completada sin evidencia`);

      return NextResponse.json({
        success: true,
        message: 'Tarea completada exitosamente'
      });
    }

    // ========== CASO 2: Tarea Admin (TaskSubmission) ==========
    if (submissionId && (tipo === 'EXTRAORDINARIA' || tipo === 'EVENTO')) {
      const submission = await prisma.taskSubmission.findUnique({
        where: { id: submissionId },
        include: {
          AdminTask: true
        }
      });

      if (!submission || submission.usuarioId !== userId) {
        return NextResponse.json(
          { error: 'Tarea no encontrada o sin permisos' },
          { status: 404 }
        );
      }

      // Verificar que la tarea no requiera evidencia
      if (submission.AdminTask?.requiereEvidencia) {
        return NextResponse.json(
          { error: 'Esta tarea requiere evidencia' },
          { status: 400 }
        );
      }

      // Completar la tarea (marcar como APPROVED directamente para tareas sin evidencia)
      const updated = await prisma.taskSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date()
        }
      });

      // Otorgar puntos cuánticos si tiene recompensa
      if (submission.AdminTask?.pointsReward && submission.AdminTask.pointsReward > 0) {
        await prisma.usuario.update({
          where: { id: userId },
          data: {
            puntosCuanticos: {
              increment: submission.AdminTask.pointsReward
            }
          }
        });

        console.log(`💰 Se otorgaron ${submission.AdminTask.pointsReward} puntos al usuario ${userId}`);
      }

      console.log(`✅ Tarea admin ${submissionId} completada sin evidencia`);

      return NextResponse.json({
        success: true,
        message: 'Tarea completada exitosamente',
        pointsAwarded: submission.AdminTask?.pointsReward || 0
      });
    }

    return NextResponse.json(
      { error: 'Tipo de tarea no válido' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Error al completar tarea:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
