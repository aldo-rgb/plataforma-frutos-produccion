import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/admin/license-orders/[orderId]/reject
 * Rechaza/elimina una orden de compra de licencias
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    logger.debug('❌ Rechazando orden:', params.orderId);
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Solo administradores pueden rechazar órdenes.' },
        { status: 403 }
      );
    }

    const { orderId } = params;
    const body = await req.json();
    const { reason } = body; // Razón opcional del rechazo

    // Buscar la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: true,
        RequestedByUser: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden no esté ya completada
    if (order.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'No se puede rechazar una orden que ya fue completada' },
        { status: 400 }
      );
    }

    // Actualizar el estado a CANCELLED
    const updatedOrder = await prisma.licenseOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentData: {
          ...(typeof order.paymentData === 'object' && order.paymentData !== null ? order.paymentData : {}),
          cancelledAt: new Date().toISOString(),
          cancelledBy: session.user.id,
          cancelledReason: reason || 'Rechazada por el administrador',
        },
      },
    });

    logger.debug('✅ Orden rechazada exitosamente');

    // TODO: Enviar notificación al director de escuela sobre el rechazo
    // Esto puede incluir un correo electrónico o una notificación en la plataforma

    return NextResponse.json({
      success: true,
      message: 'Orden rechazada exitosamente',
      order: updatedOrder,
    });
  } catch (error: any) {
    logger.error('❌ Error al rechazar orden:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al rechazar la orden' },
      { status: 500 }
    );
  }
}
