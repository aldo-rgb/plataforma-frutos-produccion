import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT - Actualizar transformación
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
    const transformId = parseInt(id);
    const body = await request.json();
    const { name, description, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const transform = await prisma.metamorfosisTransform.update({
      where: { id: transformId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null
      }
    });

    return NextResponse.json(transform);
  } catch (error) {
    console.error('Error al actualizar transformación:', error);
    return NextResponse.json({ error: 'Error al actualizar transformación' }, { status: 500 });
  }
}

// DELETE - Eliminar transformación
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
    const transformId = parseInt(id);

    // Verificar si tiene asignaciones
    const assignmentsCount = await prisma.metamorfosisAssignment.count({
      where: { transformId }
    });

    if (assignmentsCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: tiene ${assignmentsCount} asignaciones` 
      }, { status: 400 });
    }

    await prisma.metamorfosisTransform.delete({
      where: { id: transformId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar transformación:', error);
    return NextResponse.json({ error: 'Error al eliminar transformación' }, { status: 500 });
  }
}
