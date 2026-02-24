import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function DELETE(req: NextRequest) {
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
        { success: false, error: 'No hay organización asociada' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'ID de orden requerido' },
        { status: 400 }
      );
    }

    // Buscar la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden pertenece a la organización del usuario
    if (order.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para eliminar esta orden' },
        { status: 403 }
      );
    }

    // Solo se pueden eliminar órdenes pendientes
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden eliminar órdenes pendientes' },
        { status: 400 }
      );
    }

    // Eliminar la orden
    await prisma.licenseOrder.delete({
      where: { id: orderId },
    });

    logger.debug('✅ Orden eliminada:', {
      orderId,
      organizationId: user.organizationId,
      deletedBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Orden eliminada exitosamente',
    });
  } catch (error) {
    logger.error('Error al eliminar orden:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar la orden',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
