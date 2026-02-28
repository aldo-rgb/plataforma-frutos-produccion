import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Crear una nueva canción de metamorfosis
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const userRol = session.user.rol;

    if (!['TRAINER', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { title, artist, spotifyUrl, previewUrl, imageUrl } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    const song = await prisma.metamorfosisSong.create({
      data: {
        title: title.trim(),
        artist: artist?.trim() || null,
        spotifyUrl: spotifyUrl || null,
        previewUrl: previewUrl || null,
        imageUrl: imageUrl || null,
        trainerId: userId,
        isSystemDefault: true, // Disponible para todos los trainers
        isActive: true,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(song);
  } catch (error) {
    logger.error('Error al crear canción:', error);
    return NextResponse.json({ error: 'Error al crear elemento' }, { status: 500 });
  }
}

// GET - Obtener todas las canciones de metamorfosis
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const songs = await prisma.metamorfosisSong.findMany({
      where: {
        isActive: true,
        OR: [
          { isSystemDefault: true },
          { trainerId: userId }
        ]
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { title: 'asc' }
      ]
    });

    return NextResponse.json(songs);
  } catch (error) {
    logger.error('Error al obtener canciones:', error);
    return NextResponse.json({ error: 'Error al obtener elementos' }, { status: 500 });
  }
}
