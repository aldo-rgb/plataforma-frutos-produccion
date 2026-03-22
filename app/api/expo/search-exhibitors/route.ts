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

    // Construir condiciones base
    const whereConditions: any = {
      // Tiene perfil de negocio configurado (con nombre de negocio)
      BusinessProfile: { 
        isNot: null,
        businessName: { not: null }
      },
      // Nombre contiene el query
      OR: [
        { nombre: { contains: query, mode: 'insensitive' } },
        { BusinessProfile: { businessName: { contains: query, mode: 'insensitive' } } }
      ]
    };

    // Si hay visionId, filtrar por participantes de esa visión con nivel PL
    if (visionId) {
      whereConditions.vision_enrollments = {
        some: {
          visionId: parseInt(visionId),
          level: 'PL',
          attendance: true
        }
      };
    }

    // Buscar expositores
    const exhibitors = await prisma.usuario.findMany({
      where: whereConditions,
      select: {
        id: true,
        nombre: true,
        imagen: true,
        BusinessProfile: {
          select: {
            headline: true,
            businessName: true
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
      headline: e.BusinessProfile?.headline || null,
      businessName: e.BusinessProfile?.businessName || null
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
