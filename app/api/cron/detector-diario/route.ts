import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/cron/detector-diario
 * Cron Job que se ejecuta diariamente (06:00 AM) para detectar usuarios con tareas retrasadas
 * y marcarlos para intervención
 */
export async function GET(req: Request) {
  try {
    // Verificar autorización del cron (token secreto)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'quantum-cron-2025';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    logger.debug('🔍 Iniciando detección diaria de tareas retrasadas...');

    // Calcular fecha límite (HOY - 3 días)
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    tresDiasAtras.setHours(0, 0, 0, 0);

    // Buscar todas las tareas retrasadas (PENDING + > 3 días + STANDARD)
    const tareasRetrasadas = await prisma.taskInstance.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          lt: tresDiasAtras
        },
        Accion: {
          rarity: 'COMMON' // Solo tareas STANDARD
        }
      },
      select: {
        id: true,
        usuarioId: true,
        dueDate: true,
        Accion: {
          select: {
            texto: true,
            Meta: {
              select: {
                categoria: true
              }
            }
          }
        }
      }
    });

    logger.debug(`📊 Tareas retrasadas encontradas: ${tareasRetrasadas.length}`);

    // Agrupar por usuario
    const usuariosAfectados = new Map<number, any[]>();
    
    tareasRetrasadas.forEach(tarea => {
      const userId = tarea.usuarioId;
      if (!usuariosAfectados.has(userId)) {
        usuariosAfectados.set(userId, []);
      }
      usuariosAfectados.get(userId)!.push({
        id: tarea.id,
        texto: tarea.Accion.texto,
        dueDate: tarea.dueDate,
        diasRetraso: Math.floor((new Date().getTime() - new Date(tarea.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        categoria: tarea.Accion.Meta?.categoria
      });
    });

    logger.debug(`👥 Usuarios afectados: ${usuariosAfectados.size}`);

    // Marcar usuarios para intervención y crear notificaciones
    const resultados = [];

    for (const [usuarioId, tareas] of usuariosAfectados.entries()) {
      try {
        // Crear notificación de intervención
        const notificacion = await prisma.notificacion.create({
          data: {
            usuarioId,
            tipo: 'QUANTUM_INTERVENTION',
            titulo: '💡 Sesión de Desbloqueo Disponible',
            mensaje: `Quantum detectó ${tareas.length} tareas con más de 3 días de retraso. ¿Hablamos 2 minutos para desbloquearlas?`,
            leida: false,
            metadata: JSON.stringify({
              tareasCount: tareas.length,
              tareasIds: tareas.map(t => t.id),
              diasPromedioRetraso: Math.floor(
                tareas.reduce((sum, t) => sum + t.diasRetraso, 0) / tareas.length
              )
            })
          }
        });

        resultados.push({
          usuarioId,
          tareasCount: tareas.length,
          notificacionId: notificacion.id
        });

        logger.debug(`✅ Usuario ${usuarioId}: ${tareas.length} tareas retrasadas → Notificación creada`);

      } catch (error) {
        logger.error(`❌ Error procesando usuario ${usuarioId}:`, error);
      }
    }

    const resumen = {
      timestamp: new Date().toISOString(),
      tareasRetrasadasTotal: tareasRetrasadas.length,
      usuariosAfectados: usuariosAfectados.size,
      notificacionesCreadas: resultados.length,
      fechaLimite: tresDiasAtras.toISOString(),
      resultados
    };

    logger.debug('✅ Detección diaria completada:', resumen);

    return NextResponse.json({
      success: true,
      message: 'Detección diaria ejecutada',
      resumen
    });

  } catch (error: any) {
    logger.error('❌ Error en cron detector:', error);
    return NextResponse.json(
      { error: 'Error ejecutando cron', details: error.message },
      { status: 500 }
    );
  }
}
