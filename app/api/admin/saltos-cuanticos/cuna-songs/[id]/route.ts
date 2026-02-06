import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// PUT - Actualizar canción de cuna
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
    const cunaSongId = parseInt(id);
    const body = await request.json();
    const { title, artist, spotifyUrl, previewUrl, imageUrl } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    const cunaSong = await prisma.metamorfosisCunaSong.update({
      where: { id: cunaSongId },
      data: {
        title: title.trim(),
        artist: artist?.trim() || null,
        spotifyUrl: spotifyUrl?.trim() || null,
        previewUrl: previewUrl?.trim() || null,
        imageUrl: imageUrl?.trim() || null
      }
    });

    return NextResponse.json(cunaSong);
  } catch (error) {
    logger.error('Error al actualizar canción de cuna:', error);
    return NextResponse.json({ error: 'Error al actualizar canción de cuna' }, { status: 500 });
  }
}

// DELETE - Eliminar canción de cuna
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
    const cunaSongId = parseInt(id);

    // Verificar si tiene asignaciones
    const assignmentsCount = await prisma.metamorfosisAssignment.count({
      where: { cunaSongId }
    });

    if (assignmentsCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: tiene ${assignmentsCount} asignaciones` 
      }, { status: 400 });
    }

    await prisma.metamorfosisCunaSong.delete({
      where: { id: cunaSongId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error al eliminar canción de cuna:', error);
    return NextResponse.json({ error: 'Error al eliminar canción de cuna' }, { status: 500 });
  }
}
