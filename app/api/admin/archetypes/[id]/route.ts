import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - Obtener un arquetipo del sistema por ID
export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const archetypeId = parseInt(id);

    // Verificar que sea ADMINISTRADOR o ADMIN
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR' && user?.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden acceder a esta función' }, { status: 403 });
    }

    const archetype = await prisma.archetype.findFirst({
      where: {
        id: archetypeId,
        isSystemDefault: true // Solo arquetipos del sistema
      },
      include: {
        _count: {
          select: { Assignments: true }
        }
      }
    });

    if (!archetype) {
      return NextResponse.json({ error: 'Arquetipo del sistema no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ archetype });

  } catch (error) {
    console.error('Error fetching system archetype:', error);
    return NextResponse.json({ error: 'Error al obtener arquetipo del sistema' }, { status: 500 });
  }
}

// PUT - Actualizar un arquetipo del sistema
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const archetypeId = parseInt(id);
    const body = await request.json();

    // Verificar que sea ADMINISTRADOR o ADMIN
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR' && user?.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden editar arquetipos del sistema' }, { status: 403 });
    }

    // Verificar que el arquetipo existe y es del sistema
    const existingArchetype = await prisma.archetype.findFirst({
      where: {
        id: archetypeId,
        isSystemDefault: true
      }
    });

    if (!existingArchetype) {
      return NextResponse.json({ error: 'Arquetipo del sistema no encontrado' }, { status: 404 });
    }

    const { 
      name, 
      category, 
      maneraSerTag, 
      maneraSerLabel, 
      scriptFeedback, 
      description,
      imageUrl,
      isActive 
    } = body;

    const archetype = await prisma.archetype.update({
      where: { id: archetypeId },
      data: {
        name,
        category,
        maneraSerTag,
        maneraSerLabel,
        scriptFeedback,
        description,
        imageUrl,
        isActive
      }
    });

    return NextResponse.json({ archetype });

  } catch (error) {
    console.error('Error updating system archetype:', error);
    return NextResponse.json({ error: 'Error al actualizar arquetipo del sistema' }, { status: 500 });
  }
}

// DELETE - Eliminar (desactivar) un arquetipo del sistema
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const archetypeId = parseInt(id);

    // Verificar que sea ADMINISTRADOR o ADMIN
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR' && user?.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar arquetipos del sistema' }, { status: 403 });
    }

    // Verificar que el arquetipo existe y es del sistema
    const existingArchetype = await prisma.archetype.findFirst({
      where: {
        id: archetypeId,
        isSystemDefault: true
      }
    });

    if (!existingArchetype) {
      return NextResponse.json({ error: 'Arquetipo del sistema no encontrado' }, { status: 404 });
    }

    // Verificar si tiene asignaciones activas
    const assignmentsCount = await prisma.archetypeAssignment.count({
      where: { archetypeId }
    });

    if (assignmentsCount > 0) {
      // Si tiene asignaciones, solo desactivar
      await prisma.archetype.update({
        where: { id: archetypeId },
        data: { isActive: false }
      });
      return NextResponse.json({ 
        message: 'Arquetipo desactivado (tiene asignaciones activas)',
        deactivated: true 
      });
    }

    // Si no tiene asignaciones, eliminar completamente
    await prisma.archetype.delete({
      where: { id: archetypeId }
    });

    return NextResponse.json({ 
      message: 'Arquetipo eliminado correctamente',
      deleted: true 
    });

  } catch (error) {
    console.error('Error deleting system archetype:', error);
    return NextResponse.json({ error: 'Error al eliminar arquetipo del sistema' }, { status: 500 });
  }
}
