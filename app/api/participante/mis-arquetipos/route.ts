import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener arquetipos asignados al participante actual
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const showAll = searchParams.get('showAll') === 'true';

    // Construir filtro
    const whereClause: any = {
      participantId: userId
    };

    // Por defecto solo mostrar los no vistos o recientes
    if (!showAll) {
      whereClause.OR = [
        { status: 'SENT' },
        { 
          createdAt: { 
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      ];
    }

    if (visionId) {
      whereClause.visionId = parseInt(visionId);
    }

    const assignments = await prisma.archetypeAssignment.findMany({
      where: whereClause,
      include: {
        Archetype: {
          select: {
            id: true,
            name: true,
            category: true,
            maneraSerTag: true,
            maneraSerLabel: true,
            scriptFeedback: true,
            imageUrl: true
          }
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
      },
      orderBy: { createdAt: 'desc' }
    });

    // Contar nuevos (no vistos)
    const newCount = assignments.filter(a => a.status === 'SENT').length;

    return NextResponse.json({ 
      assignments,
      newCount,
      total: assignments.length
    });

  } catch (error) {
    console.error('Error fetching my archetypes:', error);
    return NextResponse.json({ error: 'Error al obtener arquetipos' }, { status: 500 });
  }
}

// POST - Marcar como visto/aceptado/transformado
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { assignmentId, action, responseText, responseVideoUrl } = body;

    if (!assignmentId || !action) {
      return NextResponse.json({ error: 'Se requiere assignmentId y action' }, { status: 400 });
    }

    // Verificar que la asignación pertenece al usuario
    const assignment = await prisma.archetypeAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment || assignment.participantId !== userId) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Actualizar según la acción
    const updateData: any = {};

    switch (action) {
      case 'view':
        if (assignment.status === 'SENT') {
          updateData.status = 'VIEWED';
          updateData.viewedAt = new Date();
        }
        break;
      case 'accept':
        updateData.status = 'ACCEPTED';
        updateData.acceptedAt = new Date();
        break;
      case 'transform':
        updateData.status = 'TRANSFORMED';
        updateData.transformedAt = new Date();
        if (responseText) updateData.responseText = responseText;
        if (responseVideoUrl) updateData.responseVideoUrl = responseVideoUrl;
        break;
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const updated = await prisma.archetypeAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        Archetype: true
      }
    });

    return NextResponse.json({ assignment: updated });

  } catch (error) {
    console.error('Error updating archetype status:', error);
    return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 });
  }
}
