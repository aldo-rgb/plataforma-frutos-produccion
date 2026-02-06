import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No hay organización asociada' }, { status: 400 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
    }

    // Buscar la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Verificar que la orden pertenece a la organización del usuario
    if (order.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No autorizado para cancelar esta orden' }, { status: 403 });
    }

    // Solo se pueden cancelar órdenes pendientes
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: `No se puede cancelar una orden con estado: ${order.status}` },
        { status: 400 }
      );
    }

    // Cancelar la orden
    const cancelledOrder = await prisma.licenseOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Orden cancelada exitosamente',
      order: cancelledOrder,
    });
  } catch (error) {
    logger.error('❌ Error cancelling license order:', error);
    return NextResponse.json(
      { error: 'Error al cancelar la orden' },
      { status: 500 }
    );
  }
}
