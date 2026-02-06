import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener usuario y visión directamente para formulario médico de emergencia
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const visionId = searchParams.get('visionId');

    if (!userId || !visionId) {
      return NextResponse.json({ error: 'Se requieren userId y visionId' }, { status: 400 });
    }

    const userIdNum = parseInt(userId);
    const visionIdNum = parseInt(visionId);

    if (isNaN(userIdNum) || isNaN(visionIdNum)) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    // Buscar usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userIdNum },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar visión con sus productos
    const vision = await prisma.vision.findUnique({
      where: { id: visionIdNum },
      select: {
        id: true,
        nombre: true,
        SchoolProduct: {
          select: {
            id: true,
            name: true,
            levelType: true,
            startDate: true,
            endDate: true
          },
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email
      },
      vision: {
        id: vision.id,
        nombre: vision.nombre,
        SchoolProduct: vision.SchoolProduct
      }
    });

  } catch (error) {
    logger.error('Error en user-direct:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
