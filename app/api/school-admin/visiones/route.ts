import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    // Obtener todas las visiones de la organización
    const visiones = await prisma.vision.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        Coordinador: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        _count: {
          select: {
            Participantes: true,
            GameChangers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      visiones,
    });
  } catch (error) {
    console.error('Error fetching visiones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener las visiones' },
      { status: 500 }
    );
  }
}
