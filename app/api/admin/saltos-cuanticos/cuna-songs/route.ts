import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Crear una canción de cuna del sistema
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userRol = session.user.rol;

    if (!['ADMIN', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { title, artist, spotifyUrl, previewUrl, imageUrl } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    const cunaSong = await prisma.metamorfosisCunaSong.create({
      data: {
        title: title.trim(),
        artist: artist?.trim() || null,
        spotifyUrl: spotifyUrl?.trim() || null,
        previewUrl: previewUrl?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        isSystemDefault: true,
        trainerId: null
      }
    });

    return NextResponse.json(cunaSong);
  } catch (error) {
    console.error('Error al crear canción de cuna:', error);
    return NextResponse.json({ error: 'Error al crear canción de cuna' }, { status: 500 });
  }
}
