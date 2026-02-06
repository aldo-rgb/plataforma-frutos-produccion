import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/cron/check-multiday-tasks
 * Verifica misiones multi-día y cancela las que tienen días vencidos sin completar
 * Este endpoint debe ser llamado por un cron job cada hora
 */
export async function GET(req: Request) {
  try {
    // Verificar secret key para seguridad
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    logger.debug('🔍 Verificando misiones multi-día...');

    const ahora = new Date();

    // Buscar todas las tareas diarias (hijas) que:
    // 1. Tienen parentTaskId (son parte de misión multi-día)
    // 2. Su fecha límite ya pasó
    // 3. Tienen submissions PENDING (no completadas)
    const tareasDiariasVencidas = await prisma.adminTask.findMany({
      where: {
        parentTaskId: { not: null },
        fechaLimite: { lt: ahora },
        isActive: true,
        Submissions: {
          some: {
            status: 'PENDING'
          }
        }
      },
      include: {
        Submissions: {
          where: {
            status: 'PENDING'
          }
        },
        ParentTask: {
          select: {
            id: true,
            titulo: true,
            DailyTasks: {
              select: {
                id: true,
                diaNumero: true
              },
              orderBy: {
                diaNumero: 'asc'
              }
            }
          }
        }
      }
    });

    logger.debug(`📊 Encontradas ${tareasDiariasVencidas.length} tareas diarias vencidas`);

    let usuariosAfectados = 0;
    let misionesCompletas = new Set<number>();

    for (const tareaVencida of tareasDiariasVencidas) {
      if (!tareaVencida.ParentTask) continue;

      const parentTaskId = tareaVencida.ParentTask.id;
      const todasLasTareasDiarias = tareaVencida.ParentTask.DailyTasks;

      // Para cada submission pendiente de esta tarea vencida
      for (const submission of tareaVencida.Submissions) {
        logger.debug(`❌ Usuario ${submission.usuarioId} falló día ${tareaVencida.diaNumero} de la misión "${tareaVencida.ParentTask.titulo}"`);

        // Marcar TODAS las submissions de este usuario para TODA la misión multi-día como EXPIRED
        for (const tareaHermana of todasLasTareasDiarias) {
          await prisma.taskSubmission.updateMany({
            where: {
              adminTaskId: tareaHermana.id,
              usuarioId: submission.usuarioId,
              status: { in: ['PENDING', 'SUBMITTED'] } // Solo afectar las que no están completadas
            },
            data: {
              status: 'EXPIRED',
              reviewedAt: new Date(),
              feedbackMentor: `❌ Misión cancelada: No completaste el Día ${tareaVencida.diaNumero}. En misiones multi-día debes completar TODOS los días consecutivos.`
            }
          });
        }

        usuariosAfectados++;
        misionesCompletas.add(parentTaskId);
      }
    }

    logger.debug(`✅ Proceso completado: ${usuariosAfectados} usuarios perdieron ${misionesCompletas.size} misiones multi-día`);

    return NextResponse.json({
      success: true,
      tareasVerificadas: tareasDiariasVencidas.length,
      usuariosAfectados,
      misionesCanceladas: misionesCompletas.size
    });

  } catch (error: any) {
    logger.error('❌ Error verificando misiones multi-día:', error);
    return NextResponse.json(
      { error: 'Error verificando misiones', details: error.message },
      { status: 500 }
    );
  }
}
