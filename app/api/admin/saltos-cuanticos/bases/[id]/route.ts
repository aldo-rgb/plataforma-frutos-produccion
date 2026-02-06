import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// PUT - Actualizar personaje base
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userRol = session.user.rol;

    if (!['ADMIN', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const baseId = parseInt(id);
    const body = await request.json();
    const { name, description, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const base = await prisma.metamorfosisBase.update({
      where: { id: baseId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null
      }
    });

    return NextResponse.json(base);
  } catch (error) {
    logger.error('Error al actualizar personaje base:', error);
    return NextResponse.json({ error: 'Error al actualizar personaje base' }, { status: 500 });
  }
}

// DELETE - Eliminar personaje base
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userRol = session.user.rol;

    if (!['ADMIN', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const baseId = parseInt(id);

    // Verificar si tiene asignaciones
    const assignmentsCount = await prisma.metamorfosisAssignment.count({
      where: { baseId }
    });

    if (assignmentsCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: tiene ${assignmentsCount} asignaciones` 
      }, { status: 400 });
    }

    await prisma.metamorfosisBase.delete({
      where: { id: baseId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error al eliminar personaje base:', error);
    return NextResponse.json({ error: 'Error al eliminar personaje base' }, { status: 500 });
  }
}
