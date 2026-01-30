import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ exhibitors: [] });
    }

    // Buscar expositores (usuarios con BusinessProfile)
    const exhibitors = await prisma.usuario.findMany({
      where: {
        AND: [
          // Tiene perfil de negocio
          { BusinessProfile: { isNot: null } },
          // Coincide con el nombre
          { nombre: { contains: query, mode: 'insensitive' } }
        ]
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
    console.error('Error buscando expositores:', error);
    return NextResponse.json(
      { error: 'Error al buscar' },
      { status: 500 }
    );
  }
}
