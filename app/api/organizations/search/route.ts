import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET: Búsqueda de organizaciones para autocompletado (público)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json({ organizations: [] });
    }

    // Buscar organizaciones activas que coincidan con la búsqueda
    const organizations = await prisma.organization.findMany({
      where: {
        status: 'ACTIVE',
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandColor: true
      },
      take: 10,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      organizations
    });

  } catch (error) {
    logger.error('Error buscando organizaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar organizaciones' },
      { status: 500 }
    );
  }
}
