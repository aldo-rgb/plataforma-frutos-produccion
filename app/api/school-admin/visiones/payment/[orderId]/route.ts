import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { orderId } = await params;

    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            brandColor: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order,
      organization: order.Organization,
    });
  } catch (error: any) {
    logger.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Error al obtener la orden', details: error.message },
      { status: 500 }
    );
  }
}
