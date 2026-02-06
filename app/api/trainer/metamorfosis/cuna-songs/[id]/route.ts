import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener una canción de cuna específica
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
    const cunaId = parseInt(id);
    
    if (isNaN(cunaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const cunaSong = await prisma.metamorfosisCunaSong.findUnique({
      where: { id: cunaId }
    });

    if (!cunaSong) {
      return NextResponse.json({ error: 'Canción de cuna no encontrada' }, { status: 404 });
    }

    return NextResponse.json(cunaSong);
  } catch (error) {
    logger.error('Error al obtener canción de cuna:', error);
    return NextResponse.json({ error: 'Error al obtener elemento' }, { status: 500 });
  }
}

// PUT - Actualizar una canción de cuna
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
    const cunaId = parseInt(id);
    const userId = session.user.id;
    const userRol = session.user.rol;
    
    if (isNaN(cunaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await prisma.metamorfosisCunaSong.findUnique({
      where: { id: cunaId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Canción de cuna no encontrada' }, { status: 404 });
    }

    // Solo el dueño o admin pueden editar
    // Admin puede editar los del sistema (trainerId = null)
    // Trainer puede editar los suyos propios
    if (existing.isSystemDefault && userRol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado para editar elementos del sistema' }, { status: 403 });
    }
    
    if (!existing.isSystemDefault && existing.trainerId !== userId && userRol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado para editar este elemento' }, { status: 403 });
    }

    const body = await request.json();
    const { title, artist, spotifyUrl, previewUrl, imageUrl } = body;

    const updated = await prisma.metamorfosisCunaSong.update({
      where: { id: cunaId },
      data: {
        title: title?.trim() || existing.title,
        artist: artist?.trim() ?? existing.artist,
        spotifyUrl: spotifyUrl ?? existing.spotifyUrl,
        previewUrl: previewUrl ?? existing.previewUrl,
        imageUrl: imageUrl ?? existing.imageUrl
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error al actualizar canción de cuna:', error);
    return NextResponse.json({ error: 'Error al actualizar elemento' }, { status: 500 });
  }
}

// DELETE - Eliminar una canción de cuna
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
    const cunaId = parseInt(id);
    const userId = session.user.id;
    const userRol = session.user.rol;
    
    if (isNaN(cunaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await prisma.metamorfosisCunaSong.findUnique({
      where: { id: cunaId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Canción de cuna no encontrada' }, { status: 404 });
    }

    // Solo el dueño o admin pueden eliminar
    if (existing.isSystemDefault && userRol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado para eliminar elementos del sistema' }, { status: 403 });
    }
    
    if (!existing.isSystemDefault && existing.trainerId !== userId && userRol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado para eliminar este elemento' }, { status: 403 });
    }

    // Soft delete
    await prisma.metamorfosisCunaSong.update({
      where: { id: cunaId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error al eliminar canción de cuna:', error);
    return NextResponse.json({ error: 'Error al eliminar elemento' }, { status: 500 });
  }
}
