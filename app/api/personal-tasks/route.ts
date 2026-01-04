import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener tareas personales para una fecha específica
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener fecha del query param
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });
    }

    // Parsear fecha y calcular rango (inicio y fin del día en UTC)
    const targetDate = new Date(dateParam);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(6, 0, 0, 0); // 6AM UTC = midnight Mexico
    
    const endOfDay = new Date(targetDate);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setUTCHours(6, 0, 0, 0);

    // Obtener tareas personales del usuario para esa fecha
    const personalTasks = await prisma.personalTask.findMany({
      where: {
        usuarioId: user.id,
        dueDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ personalTasks });

  } catch (error) {
    console.error('❌ Error obteniendo tareas personales:', error);
    return NextResponse.json(
      { error: 'Error obteniendo tareas personales' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva tarea personal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { titulo, descripcion, dueDate } = body;

    // Validaciones
    if (!titulo || titulo.trim() === '') {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    if (!dueDate) {
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 });
    }

    // Formatear fecha a medianoche México (6AM UTC)
    const targetDate = new Date(dueDate);
    targetDate.setUTCHours(6, 0, 0, 0);

    // Crear tarea personal
    const newTask = await prisma.personalTask.create({
      data: {
        usuarioId: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        dueDate: targetDate,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ task: newTask }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando tarea personal:', error);
    return NextResponse.json(
      { error: 'Error creando tarea personal' },
      { status: 500 }
    );
  }
}
