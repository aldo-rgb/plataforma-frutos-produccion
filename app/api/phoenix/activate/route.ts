import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, MicroTaskType } from '@prisma/client';
import { sendPhoenixSOSNotifications } from '@/lib/notifications';

const prisma = new PrismaClient();

/**
 * PROTOCOLO FÉNIX - ACTIVAR
 * 
 * Endpoint para activar el modo crisis management:
 * 1. Crea snapshot de tareas actuales
 * 2. Reagenda tareas pendientes
 * 3. Marca tareas viejas como SKIPPED_GRACEFULLY
 * 4. Retorna opciones de micro-tareas
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const usuarioId = session.user.id as number;
    const body = await req.json();
    const { triggerReason } = body;

    // Verificar que el usuario sea PARTICIPANTE o GAMECHANGER
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        assignedMentorId: true,
        coordinadorId: true,
        gameChangerId: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (usuario.rol !== 'PARTICIPANTE' && usuario.rol !== 'GAMECHANGER') {
      return NextResponse.json(
        { error: 'Solo participantes y game changers pueden activar el Protocolo Fénix' },
        { status: 403 }
      );
    }

    // VERIFICAR SI YA SE COMPLETÓ UNA SESIÓN HOY
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const completedSessionToday = await prisma.phoenixSession.findFirst({
      where: {
        usuarioId,
        microTaskCompleted: true,
        completedAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    if (completedSessionToday) {
      return NextResponse.json({
        alreadyCompletedToday: true,
        message: '✅ Ya completaste el Protocolo Fénix hoy. Respira y continúa con tu día.',
        completedAt: completedSessionToday.completedAt
      });
    }

    // 1. SNAPSHOT: Obtener todas las tareas pendientes de HOY y anteriores
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingTasks = await prisma.taskInstance.findMany({
      where: {
        usuarioId,
        status: 'PENDING',
        dueDate: {
          lte: today
        }
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      }
    });

    // 2. GUARDAR SNAPSHOT (para posible restauración)
    const snapshot = pendingTasks.map(task => ({
      id: task.id,
      accionId: task.accionId,
      dueDate: task.dueDate,
      originalDueDate: task.originalDueDate,
      postponeCount: task.postponeCount,
      accionNombre: task.Accion.texto,
      metaCategoria: task.Accion.Meta.categoria
    }));

    // 3. REAGENDAR: Mover tareas de HOY a MAÑANA
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksToReschedule = pendingTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    });

    // 4. PERDONAR: Marcar tareas atrasadas como SKIPPED_GRACEFULLY
    const tasksToSkip = pendingTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() < today.getTime();
    });

    // Ejecutar updates en transacción
    await prisma.$transaction([
      // Reagendar tareas de HOY
      prisma.taskInstance.updateMany({
        where: {
          id: {
            in: tasksToReschedule.map(t => t.id)
          }
        },
        data: {
          dueDate: tomorrow,
          updatedAt: new Date()
        }
      }),
      
      // Perdonar tareas atrasadas
      prisma.taskInstance.updateMany({
        where: {
          id: {
            in: tasksToSkip.map(t => t.id)
          }
        },
        data: {
          status: 'SKIPPED_GRACEFULLY',
          updatedAt: new Date()
        }
      })
    ]);

    // 5. CREAR SESIÓN FÉNIX
    const phoenixSession = await prisma.phoenixSession.create({
      data: {
        usuarioId,
        triggerReason: triggerReason || 'Me siento bloqueado',
        snapshotTasks: snapshot,
        microTaskType: 'DRINK_WATER', // Default, se actualizará cuando el usuario elija
        tasksRescheduled: tasksToReschedule.length,
        tasksGracefullySkipped: tasksToSkip.length
      }
    });

    // 6. ENVIAR NOTIFICACIONES A MENTOR, COORDINADOR Y GAME CHANGER
    try {
      await sendPhoenixSOSNotifications({
        userId: usuarioId,
        userName: usuario.nombre,
        mentorId: usuario.assignedMentorId,
        coordinadorId: usuario.coordinadorId,
        gameChangerId: usuario.gameChangerId,
        triggerReason: triggerReason || 'Me siento bloqueado',
        stats: {
          tasksRescheduled: tasksToReschedule.length,
          tasksSkipped: tasksToSkip.length
        }
      });
    } catch (notificationError) {
      console.error('Error sending SOS notifications:', notificationError);
      // No bloqueamos la activación del protocolo si fallan las notificaciones
    }

    // 7. RETORNAR OPCIONES DE MICRO-TAREAS
    const microTaskOptions = [
      {
        type: 'DRINK_WATER',
        label: '💧 Beber un vaso de agua',
        duration: 1, // minutos
        description: 'Hidrátate y reinicia tu energía'
      },
      {
        type: 'READ_ONE_PAGE',
        label: '📖 Leer 1 página',
        duration: 3,
        description: 'Lee una página de cualquier libro'
      },
      {
        type: 'BREATHE_TWO_MIN',
        label: '🌬️ Respirar 2 minutos',
        duration: 2,
        description: 'Ejercicio de respiración consciente'
      },
      {
        type: 'MAKE_BED',
        label: '🛏️ Tender la cama',
        duration: 2,
        description: 'Organiza tu espacio, organiza tu mente'
      },
      {
        type: 'WALK_5_MIN',
        label: '🚶 Caminar 5 minutos',
        duration: 5,
        description: 'Mueve tu cuerpo, despeja tu mente'
      },
      {
        type: 'STRETCH',
        label: '🤸 Estirar el cuerpo',
        duration: 3,
        description: 'Libera tensión física'
      }
    ];

    return NextResponse.json({
      success: true,
      phoenixSessionId: phoenixSession.id,
      message: 'Protocolo Fénix activado. Respira, el pasado no importa.',
      stats: {
        tasksRescheduled: tasksToReschedule.length,
        tasksPerdonadas: tasksToSkip.length,
        totalProcessed: pendingTasks.length
      },
      microTaskOptions
    });

  } catch (error) {
    console.error('Error activating Phoenix Protocol:', error);
    return NextResponse.json(
      { error: 'Error al activar Protocolo Fénix' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
