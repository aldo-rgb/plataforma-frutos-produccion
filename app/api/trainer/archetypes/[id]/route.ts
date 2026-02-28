import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener un arquetipo específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const archetypeId = parseInt(id);
    if (isNaN(archetypeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const archetype = await prisma.archetype.findUnique({
      where: { id: archetypeId },
      include: {
        Usuario: {
          select: { id: true, nombre: true }
        },
        ArchetypeAssignment: {
          include: {
            Usuario_ArchetypeAssignment_participantIdToUsuario: {
              select: { id: true, nombre: true, email: true, profileImage: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: {
          select: { ArchetypeAssignment: true }
        }
      }
    });

    if (!archetype) {
      return NextResponse.json({ error: 'Arquetipo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ archetype });

  } catch (error) {
    logger.error('Error fetching archetype:', error);
    return NextResponse.json({ error: 'Error al obtener arquetipo' }, { status: 500 });
  }
}

// PUT - Actualizar arquetipo (Trainer solo puede editar los suyos propios)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const archetypeId = parseInt(id);
    
    if (isNaN(archetypeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (!user || !['TRAINER', 'DIRECTOR'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();

    // Verificar que el arquetipo existe
    const existingArchetype = await prisma.archetype.findUnique({
      where: { id: archetypeId }
    });

    if (!existingArchetype) {
      return NextResponse.json({ error: 'Arquetipo no encontrado' }, { status: 404 });
    }

    // Los arquetipos del sistema solo pueden ser editados por ADMINISTRADOR (otra API)
    if (existingArchetype.isSystemDefault) {
      return NextResponse.json({ error: 'Los arquetipos del sistema solo pueden ser editados por administradores' }, { status: 403 });
    }

    // Verificar que el arquetipo pertenece al trainer
    if (existingArchetype.trainerId !== userId) {
      return NextResponse.json({ error: 'Solo puedes editar tus propios arquetipos' }, { status: 403 });
    }

    const { name, category, maneraSerTag, maneraSerLabel, scriptFeedback, description, imageUrl, isActive } = body;

    const archetype = await prisma.archetype.update({
      where: { id: archetypeId },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(maneraSerTag && { maneraSerTag }),
        ...(maneraSerLabel && { maneraSerLabel }),
        ...(scriptFeedback && { scriptFeedback }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return NextResponse.json({ archetype });

  } catch (error) {
    logger.error('Error updating archetype:', error);
    return NextResponse.json({ error: 'Error al actualizar arquetipo' }, { status: 500 });
  }
}

// DELETE - Eliminar arquetipo (Trainer solo puede eliminar los suyos propios)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const archetypeId = parseInt(id);

    if (isNaN(archetypeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (!user || !['TRAINER', 'DIRECTOR'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const existingArchetype = await prisma.archetype.findUnique({
      where: { id: archetypeId },
      include: { _count: { select: { ArchetypeAssignment: true } } }
    });

    if (!existingArchetype) {
      return NextResponse.json({ error: 'Arquetipo no encontrado' }, { status: 404 });
    }

    // Los arquetipos del sistema solo pueden ser eliminados por ADMINISTRADOR (otra API)
    if (existingArchetype.isSystemDefault) {
      return NextResponse.json({ error: 'Los arquetipos del sistema solo pueden ser eliminados por administradores' }, { status: 403 });
    }

    // Verificar que el arquetipo pertenece al trainer
    if (existingArchetype.trainerId !== userId) {
      return NextResponse.json({ error: 'Solo puedes eliminar tus propios arquetipos' }, { status: 403 });
    }

    // Si tiene asignaciones, solo desactivar
    if (existingArchetype._count.ArchetypeAssignment > 0) {
      await prisma.archetype.update({
        where: { id: archetypeId },
        data: { isActive: false }
      });
      return NextResponse.json({ message: 'Arquetipo desactivado (tiene asignaciones)', deactivated: true });
    }

    // Si no tiene asignaciones, eliminar
    await prisma.archetype.delete({
      where: { id: archetypeId }
    });

    return NextResponse.json({ message: 'Arquetipo eliminado', deleted: true });

  } catch (error) {
    logger.error('Error deleting archetype:', error);
    return NextResponse.json({ error: 'Error al eliminar arquetipo' }, { status: 500 });
  }
}
