import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener una asignación específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const assignmentId = parseInt(id);
    
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const assignment = await prisma.metamorfosisAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        Base: true,
        Transform: true,
        Song: true,
        Participant: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    logger.error('Error al obtener asignación:', error);
    return NextResponse.json({ error: 'Error al obtener asignación' }, { status: 500 });
  }
}

// PUT - Actualizar una asignación (estado, nota, etc.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const assignmentId = parseInt(id);
    const userId = parseInt(session.user.id);
    const userRol = session.user.rol;
    
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await prisma.metamorfosisAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Solo el trainer que asignó o admin pueden editar
    if (existing.assignedById !== userId && userRol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado para editar esta asignación' }, { status: 403 });
    }

    const body = await request.json();
    const { status, customNote, performedAt } = body;

    const updateData: Record<string, unknown> = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'PERFORMED' && !existing.performedAt) {
        updateData.performedAt = new Date();
      }
    }
    if (customNote !== undefined) {
      updateData.customNote = customNote?.trim() || null;
    }
    if (performedAt) {
      updateData.performedAt = new Date(performedAt);
    }

    const updated = await prisma.metamorfosisAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        Base: true,
        Transform: true,
        Song: true,
        Participant: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error al actualizar asignación:', error);
    return NextResponse.json({ error: 'Error al actualizar asignación' }, { status: 500 });
  }
}

// DELETE - Eliminar una asignación
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const assignmentId = parseInt(id);
    const userId = parseInt(session.user.id);
    const userRol = session.user.rol;
    
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await prisma.metamorfosisAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    if (existing.assignedById !== userId && userRol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado para eliminar esta asignación' }, { status: 403 });
    }

    await prisma.metamorfosisAssignment.delete({
      where: { id: assignmentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error al eliminar asignación:', error);
    return NextResponse.json({ error: 'Error al eliminar asignación' }, { status: 500 });
  }
}
