import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/cron/expire-tasks
 * 
 * ⏳ EL "GRIM REAPER" DE MISIONES FLASH
 * 
 * Este endpoint debe ser llamado cada hora por un cron job externo (Vercel Cron, GitHub Actions, etc.)
 * o puede ser invocado manualmente desde el dashboard de admin.
 * 
 * Función: Marca como EXPIRED todas las submissions de tareas extraordinarias
 * cuya fecha/hora límite ya pasó y aún no fueron completadas.
 * 
 * Regla de Negocio:
 * - Si NOW() > deadline Y status = PENDING/SUBMITTED → status = EXPIRED
 * - Puntos ganados = 0
 * - No se puede subir evidencia después de expirar
 */
export async function GET(req: Request) {
  try {
    // Verificar secret key para seguridad
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    logger.cron('Iniciando verificación de Misiones Flash expiradas');

    const now = new Date();

    // 1. Buscar todas las tareas EXTRAORDINARIAS con fecha límite vencida
    const expiredTasks = await prisma.adminTask.findMany({
      where: {
        type: 'EXTRAORDINARY',
        isActive: true,
        fechaLimite: {
          lt: now // Fecha límite menor a ahora
        }
      },
      select: {
        id: true,
        titulo: true,
        fechaLimite: true,
        horaEvento: true,
        pointsReward: true
      }
    });

    if (expiredTasks.length === 0) {
      logger.cron('No hay misiones expiradas');
      return NextResponse.json({
        success: true,
        message: 'No hay misiones para expirar',
        expiredCount: 0
      });
    }

    logger.cron(`Encontradas ${expiredTasks.length} misiones con fecha vencida`);

    // 2. Para cada tarea expirada, actualizar submissions pendientes/submitted
    let totalExpired = 0;
    let totalUsersAffected = 0;

    for (const task of expiredTasks) {
      // Construir deadline completo (fecha + hora)
      if (!task.fechaLimite) continue;
      const deadline = new Date(task.fechaLimite);
      if (task.horaEvento) {
        const [hours, minutes] = task.horaEvento.split(':');
        deadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        // Si no hay hora, asumir fin del día
        deadline.setHours(23, 59, 59, 999);
      }

      // Solo expirar si ya pasó el deadline completo
      if (now <= deadline) {
        continue; // Aún no ha expirado
      }

      // Actualizar submissions que aún no están aprobadas
      const result = await prisma.taskSubmission.updateMany({
        where: {
          adminTaskId: task.id,
          status: {
            in: ['PENDING', 'SUBMITTED'] // Solo las que no fueron completadas
          }
        },
        data: {
          status: 'EXPIRED',
          puntosGanados: 0,
          reviewedAt: now,
          feedbackMentor: `💀 Misión Flash expirada. Oportunidad perdida de ${task.pointsReward} PC.`
        }
      });

      totalExpired += result.count;
      totalUsersAffected += result.count;

      logger.cron(`Tarea "${task.titulo}" (ID: ${task.id}): ${result.count} submissions expiradas`);

      // Opcional: Desactivar la tarea para que no aparezca más en el feed
      // await prisma.adminTask.update({
      //   where: { id: task.id },
      //   data: { isActive: false }
      // });
    }

    logger.cron(`Proceso completado: ${totalExpired} submissions expiradas de ${totalUsersAffected} usuarios`);

    return NextResponse.json({
      success: true,
      message: `${totalExpired} misiones expiradas`,
      stats: {
        tasksChecked: expiredTasks.length,
        submissionsExpired: totalExpired,
        usersAffected: totalUsersAffected
      }
    });

  } catch (error) {
    logger.error('Error en proceso de expiración', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al expirar tareas'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/expire-tasks
 * Permite invocar manualmente el proceso (útil para testing)
 */
export async function POST(req: Request) {
  return GET(req);
}
