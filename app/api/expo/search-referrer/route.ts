import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({ found: false });
    }

    // Buscar usuario que coincida con el nombre
    const user = await prisma.usuario.findFirst({
      where: {
        nombre: { contains: query, mode: 'insensitive' }
      },
      select: {
        id: true,
        nombre: true
      }
    });

    if (user) {
      return NextResponse.json({
        found: true,
        id: user.id,
        nombre: user.nombre,
        apellido: ''
      });
    }

    return NextResponse.json({ found: false });

  } catch (error) {
    console.error('Error buscando referidor:', error);
    return NextResponse.json(
      { error: 'Error al buscar' },
      { status: 500 }
    );
  }
}
