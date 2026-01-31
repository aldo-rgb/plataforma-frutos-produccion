import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/visions/list
 * Retorna la lista de todas las visiones (para filtros)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const visions = await prisma.vision.findMany({
      select: {
        id: true,
        nombre: true,
        isActive: true,
      },
      orderBy: [
        { isActive: 'desc' },
        { nombre: 'asc' }
      ]
    });

    return NextResponse.json({ visions });
  } catch (error) {
    console.error('Error fetching visions:', error);
    return NextResponse.json(
      { error: 'Error al obtener visiones' },
      { status: 500 }
    );
  }
}
