import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener organización del director
    const director = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!director?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes organización asignada' },
        { status: 400 }
      );
    }

    // Obtener usuarios de la organización que son PARTICIPANTES
    const users = await prisma.usuario.findMany({
      where: {
        organizationId: director.organizationId,
        rol: 'PARTICIPANTE',
        isActive: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        tier: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    logger.error('Error fetching available users:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
