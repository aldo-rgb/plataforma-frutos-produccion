import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// PATCH - Actualizar estado de tarea personal (completar/reabrir)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'ID de tarea inválido' }, { status: 400 });
    }

    // Verificar que la tarea existe y pertenece al usuario
    const existingTask = await prisma.personalTask.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    if (existingTask.usuarioId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    // Validar status
    if (!status || (status !== 'COMPLETED' && status !== 'PENDING')) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // Actualizar tarea
    const updatedTask = await prisma.personalTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ task: updatedTask });

  } catch (error) {
    logger.error('❌ Error actualizando tarea personal:', error);
    return NextResponse.json(
      { error: 'Error actualizando tarea personal' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar tarea personal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'ID de tarea inválido' }, { status: 400 });
    }

    // Verificar que la tarea existe y pertenece al usuario
    const existingTask = await prisma.personalTask.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    if (existingTask.usuarioId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Eliminar tarea
    await prisma.personalTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ message: 'Tarea eliminada exitosamente' });

  } catch (error) {
    logger.error('❌ Error eliminando tarea personal:', error);
    return NextResponse.json(
      { error: 'Error eliminando tarea personal' },
      { status: 500 }
    );
  }
}
