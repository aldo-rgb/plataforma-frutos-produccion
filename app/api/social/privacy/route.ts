import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * PUT /api/social/privacy
 * Actualiza configuración de privacidad social del usuario
 * 
 * Body: { visibility: 'PRIVATE' | 'COMMUNITY' | 'PUBLIC' }
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { visibility } = await req.json();

    const validOptions = ['PRIVATE', 'COMMUNITY', 'PUBLIC'];
    if (!visibility || !validOptions.includes(visibility)) {
      return NextResponse.json({ 
        error: 'Opción de visibilidad inválida',
        validOptions 
      }, { status: 400 });
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        socialVisibility: visibility
      },
      select: {
        id: true,
        nombre: true,
        socialVisibility: true
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Privacidad actualizada a ${visibility}`
    });

  } catch (error: any) {
    logger.error('Error updating privacy:', error);
    return NextResponse.json(
      { error: 'Error al actualizar privacidad', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/privacy
 * Obtiene configuración actual de privacidad
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        socialVisibility: true
      }
    });

    return NextResponse.json({
      success: true,
      visibility: user?.socialVisibility || 'COMMUNITY'
    });

  } catch (error: any) {
    logger.error('Error getting privacy:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración', details: error.message },
      { status: 500 }
    );
  }
}
