import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/license-orders
 * Obtiene todas las órdenes de licencias (para administradores)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo ADMINISTRADOR puede acceder
    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }

    // Obtener todas las órdenes con información relacionada
    const orders = await prisma.licenseOrder.findMany({
      include: {
        Organization: {
          select: {
            name: true,
          },
        },
        RequestedByUser: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Más recientes primero
      },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('❌ Error al obtener órdenes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar las órdenes',
      },
      { status: 500 }
    );
  }
}
