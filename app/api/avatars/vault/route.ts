import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener avatares guardados del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const avatares = await prisma.avatarGenerationAttempt.findMany({
      where: {
        usuarioId: parseInt(session.user.id)
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        generatedUrl: true,
        vibe: true,
        gender: true,
        createdAt: true,
        sourceImage: true
      }
    });

    return NextResponse.json({
      success: true,
      avatares
    });
  } catch (error) {
    logger.error('Error obteniendo avatares:', error);
    return NextResponse.json(
      { error: 'Error al cargar avatares' },
      { status: 500 }
    );
  }
}

// POST - Guardar nuevo avatar en el vault
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { avatarUrl, vibe = 'cyberpunk', gender = 'neutral', sourceImage = 'selfie' } = body;

    if (!avatarUrl) {
      return NextResponse.json(
        { error: 'URL del avatar es requerida' },
        { status: 400 }
      );
    }

    // Crear registro del avatar en el vault
    const nuevoAvatar = await prisma.avatarGenerationAttempt.create({
      data: {
        usuarioId: parseInt(session.user.id),
        generatedUrl: avatarUrl,
        vibe,
        gender,
        sourceImage
      }
    });

    return NextResponse.json({
      success: true,
      avatar: nuevoAvatar,
      message: '✨ Avatar guardado en The Vault'
    });
  } catch (error) {
    logger.error('Error guardando avatar:', error);
    return NextResponse.json(
      { error: 'Error al guardar avatar' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar avatar del vault
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('id');

    if (!avatarId) {
      return NextResponse.json(
        { error: 'ID del avatar es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el avatar pertenece al usuario
    const avatar = await prisma.avatarGenerationAttempt.findFirst({
      where: {
        id: parseInt(avatarId),
        usuarioId: parseInt(session.user.id)
      }
    });

    if (!avatar) {
      return NextResponse.json(
        { error: 'Avatar no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el avatar
    await prisma.avatarGenerationAttempt.delete({
      where: {
        id: parseInt(avatarId)
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar eliminado del vault'
    });
  } catch (error) {
    logger.error('Error eliminando avatar:', error);
    return NextResponse.json(
      { error: 'Error al eliminar avatar' },
      { status: 500 }
    );
  }
}
