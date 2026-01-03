import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/mentors
 * 
 * Obtiene lista de todos los mentores activos
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        profileImage: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      mentors: mentores
    });

  } catch (error: any) {
    console.error('❌ Error fetching mentors:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentores', details: error.message },
      { status: 500 }
    );
  }
}
