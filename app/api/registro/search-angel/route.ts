import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * API: Buscar usuarios para ángel de enrolamiento
 * Busca usuarios activos por nombre (para autocompletar)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({
        success: true,
        usuarios: []
      });
    }

    // Buscar usuarios cuyo nombre contenga la búsqueda
    const usuarios = await prisma.usuario.findMany({
      where: {
        nombre: {
          contains: query,
          mode: 'insensitive'
        },
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true
      },
      take: 10,
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      usuarios
    });

  } catch (error) {
    logger.error('Error buscando ángel:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar usuarios' },
      { status: 500 }
    );
  }
}
