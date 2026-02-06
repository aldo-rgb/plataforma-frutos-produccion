import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/quantum/unblocker/action
 * Ejecuta acciones rápidas desde el chat de desbloqueo
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { action, taskId, data } = await req.json();

    logger.debug(`⚡ Acción solicitada: ${action} para tarea ${taskId}`);

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que la tarea pertenece al usuario
    const tarea = await prisma.taskInstance.findFirst({
      where: {
        id: taskId,
        usuarioId: usuario.id
      }
    });

    if (!tarea) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    let result;

    switch (action) {
      case 'MOVE_TO_TODAY':
        // Mover la tarea para HOY
        result = await prisma.taskInstance.update({
          where: { id: taskId },
          data: {
            dueDate: new Date(),
            updatedAt: new Date()
          }
        });
        logger.debug(`✅ Tarea ${taskId} movida a HOY`);
        break;

      case 'MARK_COMPLETE':
        // Marcar como completada
        result = await prisma.taskInstance.update({
          where: { id: taskId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            updatedAt: new Date()
          }
        });
        logger.debug(`✅ Tarea ${taskId} marcada como completada`);
        break;

      case 'DELETE_TASK':
        // Eliminar la instancia (la acción base permanece)
        await prisma.taskInstance.delete({
          where: { id: taskId }
        });
        result = { deleted: true };
        logger.debug(`✅ Tarea ${taskId} eliminada`);
        break;

      case 'POSTPONE':
        // Posponer N días
        const diasPosponer = data?.days || 1;
        const nuevaFecha = new Date();
        nuevaFecha.setDate(nuevaFecha.getDate() + diasPosponer);

        result = await prisma.taskInstance.update({
          where: { id: taskId },
          data: {
            dueDate: nuevaFecha,
            postponeCount: tarea.postponeCount + 1,
            updatedAt: new Date()
          }
        });
        logger.debug(`✅ Tarea ${taskId} pospuesta ${diasPosponer} días`);
        break;

      case 'RESCHEDULE':
        // Reprogramar a fecha específica
        if (!data?.newDate) {
          return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });
        }

        result = await prisma.taskInstance.update({
          where: { id: taskId },
          data: {
            dueDate: new Date(data.newDate),
            updatedAt: new Date()
          }
        });
        logger.debug(`✅ Tarea ${taskId} reprogramada a ${data.newDate}`);
        break;

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      taskId,
      result
    });

  } catch (error: any) {
    logger.error('❌ Error ejecutando acción:', error);
    return NextResponse.json(
      { error: 'Error al ejecutar acción', details: error.message },
      { status: 500 }
    );
  }
}
