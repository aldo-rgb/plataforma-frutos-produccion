import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, addMonths, getDay } from 'date-fns';

// Generar instancias de tareas para los próximos 3 meses
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { accionId, durationMonths = 3 } = await req.json();

    // Obtener la acción con su información
    const accion = await prisma.accion.findUnique({
      where: { id: accionId },
      include: {
        Meta: {
          include: {
            CartaFrutos: true
          }
        }
      }
    });

    if (!accion) {
      return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 });
    }

    const usuarioId = accion.Meta.CartaFrutos.usuarioId;

    // Verificar permisos
    if (session.user.id !== usuarioId && session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Parsear días asignados
    const assignedDays = accion.assignedDays || [];
    const frequency = accion.frequency || 'WEEKLY';

    // Generar fechas
    const tasksToCreate: Array<{ accionId: number; usuarioId: number; dueDate: Date }> = [];
    let currentDate = new Date();
    const endDate = addMonths(currentDate, durationMonths);

    // Eliminar instancias futuras existentes para esta acción
    await prisma.taskInstance.deleteMany({
      where: {
        accionId: accionId,
        dueDate: { gte: new Date() },
        status: 'PENDING'
      }
    });

    while (currentDate <= endDate) {
      if (shouldCreateTask(currentDate, frequency, assignedDays)) {
        tasksToCreate.push({
          accionId: accionId,
          usuarioId: usuarioId,
          dueDate: new Date(currentDate)
        });
      }
      currentDate = addDays(currentDate, 1);
    }

    // Crear todas las instancias en batch
    const created = await prisma.taskInstance.createMany({
      data: tasksToCreate,
      skipDuplicates: true
    });

    return NextResponse.json({
      success: true,
      created: created.count,
      message: `Se generaron ${created.count} instancias de tareas para los próximos ${durationMonths} meses`
    });

  } catch (error) {
    console.error('Error generando instancias:', error);
    return NextResponse.json(
      { error: 'Error al generar instancias de tareas' },
      { status: 500 }
    );
  }
}

// Lógica para determinar si se debe crear una tarea en una fecha específica
function shouldCreateTask(date: Date, frequency: string, assignedDays: number[]): boolean {
  const dayOfWeek = getDay(date); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  switch (frequency) {
    case 'DAILY':
      return true;
    
    case 'WEEKLY':
      return assignedDays.includes(dayOfWeek);
    
    case 'BIWEEKLY':
      // Cada 2 semanas, en los días asignados
      const weekNumber = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
      return weekNumber % 2 === 0 && assignedDays.includes(dayOfWeek);
    
    case 'MONTHLY':
      // El mismo día del mes, ej: día 15 de cada mes
      return date.getDate() === (assignedDays[0] || 1);
    
    default:
      return assignedDays.includes(dayOfWeek);
  }
}

// Regenerar todas las tareas para un usuario
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { userId, durationMonths = 3 } = await req.json();

    // Verificar permisos
    if (session.user.id !== userId && session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener todas las acciones del usuario
    const acciones = await prisma.accion.findMany({
      where: {
        Meta: {
          CartaFrutos: {
            usuarioId: userId
          }
        }
      },
      include: {
        Meta: {
          include: {
            CartaFrutos: true
          }
        }
      }
    });

    let totalCreated = 0;

    // Generar instancias para cada acción
    for (const accion of acciones) {
      if (!accion.assignedDays || accion.assignedDays.length === 0) continue;

      const assignedDays = accion.assignedDays;
      const frequency = accion.frequency || 'WEEKLY';

      const tasksToCreate: Array<{ accionId: number; usuarioId: number; dueDate: Date }> = [];
      let currentDate = new Date();
      const endDate = addMonths(currentDate, durationMonths);

      while (currentDate <= endDate) {
        if (shouldCreateTask(currentDate, frequency, assignedDays)) {
          tasksToCreate.push({
            accionId: accion.id,
            usuarioId: userId,
            dueDate: new Date(currentDate)
          });
        }
        currentDate = addDays(currentDate, 1);
      }

      // Eliminar instancias futuras pendientes
      await prisma.taskInstance.deleteMany({
        where: {
          accionId: accion.id,
          dueDate: { gte: new Date() },
          status: 'PENDING'
        }
      });

      // Crear nuevas instancias
      const created = await prisma.taskInstance.createMany({
        data: tasksToCreate,
        skipDuplicates: true
      });

      totalCreated += created.count;
    }

    return NextResponse.json({
      success: true,
      totalCreated,
      actionsProcessed: acciones.length,
      message: `Se regeneraron ${totalCreated} tareas para ${acciones.length} acciones`
    });

  } catch (error) {
    console.error('Error regenerando tareas:', error);
    return NextResponse.json(
      { error: 'Error al regenerar tareas' },
      { status: 500 }
    );
  }
}
