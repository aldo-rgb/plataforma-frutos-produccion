import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT - Actualizar canción
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
    const songId = parseInt(id);
    const body = await request.json();
    const { title, artist, spotifyUrl, previewUrl, imageUrl } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    const song = await prisma.metamorfosisSong.update({
      where: { id: songId },
      data: {
        title: title.trim(),
        artist: artist?.trim() || null,
        spotifyUrl: spotifyUrl?.trim() || null,
        previewUrl: previewUrl?.trim() || null,
        imageUrl: imageUrl?.trim() || null
      }
    });

    return NextResponse.json(song);
  } catch (error) {
    console.error('Error al actualizar canción:', error);
    return NextResponse.json({ error: 'Error al actualizar canción' }, { status: 500 });
  }
}

// DELETE - Eliminar canción
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
    const songId = parseInt(id);

    // Verificar si tiene asignaciones
    const assignmentsCount = await prisma.metamorfosisAssignment.count({
      where: { songId }
    });

    if (assignmentsCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: tiene ${assignmentsCount} asignaciones` 
      }, { status: 400 });
    }

    await prisma.metamorfosisSong.delete({
      where: { id: songId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar canción:', error);
    return NextResponse.json({ error: 'Error al eliminar canción' }, { status: 500 });
  }
}
