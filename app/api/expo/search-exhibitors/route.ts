import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const visionId = searchParams.get('visionId');

    if (!query || query.length < 2) {
      return NextResponse.json({ exhibitors: [] });
    }

    // Construir condiciones de búsqueda
    const whereConditions: any[] = [
      // Tiene perfil de negocio
      { BusinessProfile: { isNot: null } },
      // Coincide con el nombre
      { nombre: { contains: query, mode: 'insensitive' } }
    ];

    // Si hay visionId, filtrar por esa visión
    if (visionId) {
      whereConditions.push({ visionId: parseInt(visionId) });
    }

    // Buscar expositores (usuarios con BusinessProfile)
    const exhibitors = await prisma.usuario.findMany({
      where: {
        AND: whereConditions
      },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        BusinessProfile: {
          select: {
            headline: true
          }
        }
      },
      take: 10
    });

    const result = exhibitors.map(e => ({
      id: e.id,
      nombre: e.nombre,
      apellido: '',
      imagen: e.imagen,
      headline: e.BusinessProfile?.headline || null
    }));

    return NextResponse.json({ exhibitors: result });

  } catch (error) {
    logger.error('Error buscando expositores:', error);
    return NextResponse.json(
      { error: 'Error al buscar' },
      { status: 500 }
    );
  }
}
