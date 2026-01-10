import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/vision/available
 * Obtiene las visiones disponibles para el usuario actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Get visions based on user's organization
    const whereClause: any = {
      isActive: true,
    };

    if (user.organizationId) {
      whereClause.organizationId = user.organizationId;
    }

    const visions = await prisma.vision.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        fecha: true,
        organizationId: true,
      },
      orderBy: {
        fecha: 'desc',
      },
      take: 10, // Last 10 visions
    });

    return NextResponse.json({
      success: true,
      visions,
    });
  } catch (error) {
    console.error('Error fetching available visions:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener visiones' },
      { status: 500 }
    );
  }
}
