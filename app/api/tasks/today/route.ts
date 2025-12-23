import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const statusFilter = searchParams.get('status');
    
    // Si no se especifica fecha, usar hoy
    const targetDate = dateParam ? parseISO(dateParam) : new Date();
    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(targetDate);

    // Query base
    const whereClause: any = {
      usuarioId: session.user.id,
      dueDate: {
        gte: startDate,
        lte: endDate
      }
    };

    // Filtro por estado si se especifica
    if (statusFilter && ['PENDING', 'COMPLETED', 'SKIPPED'].includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    // Obtener tareas del día
    const tasks = await prisma.taskInstance.findMany({
      where: whereClause,
      include: {
        Accion: {
          include: {
            Meta: {
              include: {
                CartaFrutos: {
                  select: {
                    finanzasDeclaracion: true,
                    relacionesDeclaracion: true,
                    talentosDeclaracion: true,
                    saludDeclaracion: true,
                    pazMentalDeclaracion: true,
                    ocioDeclaracion: true,
                    servicioTransDeclaracion: true,
                    servicioComunDeclaracion: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING primero
        { postponeCount: 'desc' }, // Las más pospuestas primero
        { dueDate: 'asc' }
      ]
    });

    // Transformar datos para el frontend
    const formattedTasks = tasks.map(task => {
      const categoria = task.Accion.Meta.categoria;
      const declaraciones = task.Accion.Meta.CartaFrutos;
      
      // Mapear declaración según categoría
      const declaracionMap: Record<string, string | undefined> = {
        'FINANZAS': declaraciones.finanzasDeclaracion || undefined,
        'RELACIONES': declaraciones.relacionesDeclaracion || undefined,
        'TALENTOS': declaraciones.talentosDeclaracion || undefined,
        'SALUD': declaraciones.saludDeclaracion || undefined,
        'PAZ_MENTAL': declaraciones.pazMentalDeclaracion || undefined,
        'OCIO': declaraciones.ocioDeclaracion || undefined,
        'SERVICIO_TRANS': declaraciones.servicioTransDeclaracion || undefined,
        'SERVICIO_COMUN': declaraciones.servicioComunDeclaracion || undefined,
      };

      return {
        id: task.id,
        accionId: task.accionId,
        metaId: task.Accion.metaId,
        title: task.Accion.texto,
        areaType: categoria,
        identity: declaracionMap[categoria] || '',
        dueDate: task.dueDate,
        originalDueDate: task.originalDueDate,
        status: task.status,
        postponeCount: task.postponeCount,
        completedAt: task.completedAt,
        evidenceUrl: task.evidenceUrl,
        evidenceStatus: task.evidenceStatus,
        createdAt: task.createdAt
      };
    });

    // Estadísticas del día
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      pending: tasks.filter(t => t.status === 'PENDING').length,
      overdue: tasks.filter(t => t.status === 'PENDING' && t.postponeCount > 0).length,
      completionRate: tasks.length > 0 
        ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100)
        : 0
    };

    return NextResponse.json({
      success: true,
      date: format(targetDate, 'yyyy-MM-dd'),
      tasks: formattedTasks,
      stats
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Error al obtener tareas' },
      { status: 500 }
    );
  }
}

// Completar una tarea
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la tarea pertenece al usuario
    const task = await prisma.taskInstance.findFirst({
      where: {
        id: taskId,
        usuarioId: session.user.id
      },
      include: {
        Accion: {
          include: {
            Meta: {
              include: {
                CartaFrutos: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada o sin permisos' },
        { status: 404 }
      );
    }

    // No permitir completar tareas ya completadas
    if (task.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Esta tarea ya está completada' },
        { status: 400 }
      );
    }

    // Actualizar tarea a completada
    const updatedTask = await prisma.taskInstance.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Actualizar el avance en la CartaFrutos
    const categoria = task.Accion.Meta.categoria;
    const avanceField = `${categoria.toLowerCase()}Avance`;
    
    // Incrementar el avance según la categoría
    const carta = task.Accion.Meta.CartaFrutos;
    const currentAvance = (carta as any)[avanceField] || 0;
    
    await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: {
        [avanceField]: currentAvance + 1
      }
    });

    // Si el usuario tenía muchas posposiciones, enviar mensaje de ánimo al mentor
    if (task.postponeCount >= 3 && task.Usuario.assignedMentorId) {
      await prisma.mentorAlert.create({
        data: {
          mentorId: task.Usuario.assignedMentorId,
          usuarioId: task.usuarioId,
          taskInstanceId: task.id,
          type: 'ENCOURAGEMENT',
          message: `🎉 ¡${task.Usuario.nombre} completó una tarea que había pospuesto ${task.postponeCount} veces! "${task.Accion.texto}" - ${categoria}`,
          read: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: '¡Excelente trabajo! Tarea completada 🎉'
    });

  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Error al completar la tarea' },
      { status: 500 }
    );
  }
}
