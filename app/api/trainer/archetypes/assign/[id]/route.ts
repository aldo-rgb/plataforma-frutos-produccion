import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener una asignación específica
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const assignmentId = parseInt(params.id);
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const assignment = await prisma.archetypeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        Archetype: true,
        Participant: {
          select: { id: true, nombre: true, email: true, profileImage: true }
        },
        AssignedBy: {
          select: { id: true, nombre: true }
        },
        Vision: {
          select: { id: true, nombre: true }
        },
        Product: {
          select: { id: true, name: true }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ assignment });

  } catch (error) {
    logger.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Error al obtener asignación' }, { status: 500 });
  }
}

// PUT - Actualizar estado de asignación (para cuando el participante responde)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const assignmentId = parseInt(params.id);
    
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { status, responseText, responseVideoUrl, customNote } = body;

    const assignment = await prisma.archetypeAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Verificar permisos (el participante puede actualizar su respuesta, el trainer puede actualizar nota)
    const isParticipant = assignment.participantId === userId;
    const isTrainer = assignment.assignedById === userId;

    if (!isParticipant && !isTrainer) {
      return NextResponse.json({ error: 'No tienes permiso para actualizar esta asignación' }, { status: 403 });
    }

    // Construir datos a actualizar
    const updateData: any = {};

    // El participante puede actualizar:
    if (isParticipant) {
      if (status === 'VIEWED' && assignment.status === 'SENT') {
        updateData.status = 'VIEWED';
        updateData.viewedAt = new Date();
      }
      if (status === 'ACCEPTED') {
        updateData.status = 'ACCEPTED';
        updateData.acceptedAt = new Date();
      }
      if (status === 'TRANSFORMED') {
        updateData.status = 'TRANSFORMED';
        updateData.transformedAt = new Date();
      }
      if (responseText !== undefined) updateData.responseText = responseText;
      if (responseVideoUrl !== undefined) updateData.responseVideoUrl = responseVideoUrl;
    }

    // El trainer puede actualizar la nota personalizada
    if (isTrainer && customNote !== undefined) {
      updateData.customNote = customNote;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 });
    }

    const updated = await prisma.archetypeAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        Archetype: {
          select: { name: true, maneraSerLabel: true, scriptFeedback: true }
        }
      }
    });

    return NextResponse.json({ assignment: updated });

  } catch (error) {
    logger.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Error al actualizar asignación' }, { status: 500 });
  }
}

// DELETE - Eliminar asignación
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const assignmentId = parseInt(params.id);

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const assignment = await prisma.archetypeAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Solo el trainer que asignó puede eliminar
    if (assignment.assignedById !== userId) {
      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { rol: true }
      });
      
      if (!['DIRECTOR', 'SCHOOL_ADMIN'].includes(user?.rol || '')) {
        return NextResponse.json({ error: 'No tienes permiso para eliminar esta asignación' }, { status: 403 });
      }
    }

    await prisma.archetypeAssignment.delete({
      where: { id: assignmentId }
    });

    return NextResponse.json({ message: 'Asignación eliminada' });

  } catch (error) {
    logger.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Error al eliminar asignación' }, { status: 500 });
  }
}
