import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // "2025-12"
    
    if (!month) {
      return NextResponse.json({ error: 'Mes requerido' }, { status: 400 });
    }

    // 1. Calcular rango del mes
    const startDate = startOfMonth(new Date(month + '-01'));
    const endDate = endOfMonth(startDate);

    // 2. Obtener todas las tareas del mes
    const tasks = await prisma.taskInstance.findMany({
      where: {
        usuarioId: session.user.id,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        dueDate: true,
        status: true,
        evidenceStatus: true
      }
    });

    // 3. Agrupar por fecha y calcular estados
    const calendarMap: Record<string, { total: number; pending: number; completed: number; overdue: number }> = {};
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach(task => {
      const dateKey = task.dueDate.toISOString().split('T')[0];
      
      if (!calendarMap[dateKey]) {
        calendarMap[dateKey] = { total: 0, pending: 0, completed: 0, overdue: 0 };
      }
      
      calendarMap[dateKey].total += 1;
      
      if (task.status === 'COMPLETED') {
        calendarMap[dateKey].completed += 1;
      } else {
        calendarMap[dateKey].pending += 1;
        
        // Verificar si está vencida
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        
        if (taskDate < today) {
          calendarMap[dateKey].overdue += 1;
        }
      }
    });

    return NextResponse.json(calendarMap);
  } catch (error) {
    console.error('Error getting calendar summary:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
