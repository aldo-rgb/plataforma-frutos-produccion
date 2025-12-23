import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { taskId, daysToAdd } = await req.json();

    if (!taskId || !daysToAdd) {
      return NextResponse.json(
        { error: 'taskId y daysToAdd son requeridos' },
        { status: 400 }
      );
    }

    // Obtener la tarea con información del usuario y mentor
    const task = await prisma.taskInstance.findUnique({
      where: { id: taskId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        },
        Accion: {
          include: {
            Meta: {
              select: {
                categoria: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    // Verificar permisos
    if (task.usuarioId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Calcular nuevo conteo de posposiciones
    const newPostponeCount = task.postponeCount + 1;
    const newDueDate = addDays(new Date(task.dueDate), daysToAdd);

    // IMPORTANTE: Guardar la fecha original la primera vez que se pospone
    const originalDueDate = task.originalDueDate || task.dueDate;

    // Actualizar la tarea
    const updatedTask = await prisma.taskInstance.update({
      where: { id: taskId },
      data: {
        dueDate: newDueDate,
        originalDueDate: originalDueDate, // Preservar fecha original
        postponeCount: newPostponeCount,
        updatedAt: new Date()
      }
    });

    // REGLA DE NEGOCIO: Notificar al mentor si se pospuso más de 2 veces
    if (newPostponeCount > 2 && task.Usuario.assignedMentorId) {
      const mentorId = task.Usuario.assignedMentorId;
      const mentorName = task.Usuario.Usuario_Usuario_assignedMentorIdToUsuario?.nombre || 'Mentor';
      
      // Crear alerta para el mentor
      await prisma.mentorAlert.create({
        data: {
          mentorId: mentorId,
          usuarioId: task.usuarioId,
          taskInstanceId: task.id,
          type: 'RISK_ALERT',
          message: `⚠️ ${task.Usuario.nombre} está procrastinando la tarea "${task.Accion.texto}" del área ${task.Accion.Meta.categoria}. Ha sido pospuesta ${newPostponeCount} veces.`,
          read: false
        }
      });

      // También podrías enviar un email o notificación push aquí
      console.log(`🔔 Alerta enviada al mentor ${mentorName} sobre ${task.Usuario.nombre}`);
    }

    // Mensaje de respuesta personalizado
    let message = `Tarea reagendada para ${newDueDate.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;

    if (newPostponeCount === 1) {
      message += '. Recuerda que la constancia es clave para tus objetivos.';
    } else if (newPostponeCount === 2) {
      message += '. ⚠️ Cuidado: Si la pospones una vez más, tu mentor será notificado.';
    } else if (newPostponeCount > 2) {
      message += '. Tu mentor ha sido notificado para que te pueda apoyar.';
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      postponeCount: newPostponeCount,
      mentorNotified: newPostponeCount > 2,
      message
    });

  } catch (error) {
    console.error('Error postponing task:', error);
    return NextResponse.json(
      { error: 'Error al posponer la tarea' },
      { status: 500 }
    );
  }
}

// Obtener todas las alertas del mentor
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const alerts = await prisma.mentorAlert.findMany({
      where: {
        mentorId: session.user.id,
        ...(unreadOnly && { read: false })
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        },
        TaskInstance: {
          include: {
            Accion: {
              include: {
                Meta: {
                  select: {
                    categoria: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    return NextResponse.json({
      success: true,
      alerts,
      unreadCount: alerts.filter(a => !a.read).length
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas' },
      { status: 500 }
    );
  }
}

// Marcar alerta como leída
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { alertId, markAllAsRead } = await req.json();

    if (markAllAsRead) {
      // Marcar todas como leídas
      await prisma.mentorAlert.updateMany({
        where: {
          mentorId: session.user.id,
          read: false
        },
        data: {
          read: true
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Todas las alertas marcadas como leídas'
      });
    }

    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId es requerido' },
        { status: 400 }
      );
    }

    // Marcar una alerta específica como leída
    await prisma.mentorAlert.update({
      where: {
        id: alertId,
        mentorId: session.user.id // Verificar que sea el mentor correcto
      },
      data: {
        read: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Alerta marcada como leída'
    });

  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Error al actualizar alerta' },
      { status: 500 }
    );
  }
}
