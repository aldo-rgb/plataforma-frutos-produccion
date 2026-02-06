import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/user/update-timezone
 * Actualiza la zona horaria del usuario autenticado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.debug('🔍 Sesión del usuario:', {
      id: session.user.id,
      email: session.user.email,
      nombre: session.user.nombre
    });

    const body = await request.json();
    const { timezone } = body;

    if (!timezone || typeof timezone !== 'string') {
      return NextResponse.json(
        { error: 'Zona horaria inválida' },
        { status: 400 }
      );
    }

    // Validar que sea una zona horaria válida (opcional pero recomendado)
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (e) {
      return NextResponse.json(
        { error: 'Zona horaria no reconocida' },
        { status: 400 }
      );
    }

    // Convertir el ID de la sesión a número si es necesario
    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id, 10) 
      : session.user.id;

    // Verificar que el usuario existe
    const userExists = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      logger.error(`❌ Usuario no encontrado: ID ${userId}`);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar la zona horaria del usuario
    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: { timezone },
      select: {
        id: true,
        nombre: true,
        email: true,
        timezone: true
      }
    });

    logger.debug(`🌍 Usuario ${updatedUser.nombre} actualizó su zona horaria a: ${timezone}`);

    return NextResponse.json({
      success: true,
      message: 'Zona horaria actualizada exitosamente',
      user: updatedUser
    });

  } catch (error: any) {
    logger.error('❌ Error al actualizar zona horaria:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar zona horaria',
        details: error.message
      },
      { status: 500 }
    );
  }
}
