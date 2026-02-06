import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/admin/license-orders/[orderId]/mark-paid
 * Marca una orden como pagada manualmente (para pagos en efectivo o transferencia)
 * y genera los créditos de licencia automáticamente
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo ADMINISTRADOR puede confirmar pagos
    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }

    const { orderId } = params;

    // Buscar la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden esté en estado PENDING o PROCESSING
    if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede confirmar una orden en estado ${order.status}`,
        },
        { status: 400 }
      );
    }

    // Verificar que los créditos no se hayan generado ya
    if (order.creditsGenerated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Los créditos para esta orden ya fueron generados',
        },
        { status: 400 }
      );
    }

    logger.debug(`💰 Admin ${session.user.nombre} confirmando pago manual de orden ${orderId}`);
    logger.debug(`   📦 Organización: ${order.Organization.name}`);
    logger.debug(`   🎟️  Licencias: ${order.quantity} (${order.tier})`);
    logger.debug(`   💵 Monto: $${order.amount} MXN`);
    logger.debug(`   📋 Método: ${order.paymentMethod}`);

    // Realizar la actualización en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la orden a COMPLETED
      const updatedOrder = await tx.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          creditsGenerated: true,
          creditsGeneratedAt: new Date(),
          paymentData: {
            ...((order.paymentData as any) || {}),
            manualConfirmation: true,
            confirmedBy: session.user.id,
            confirmedByName: session.user.nombre,
            confirmedAt: new Date().toISOString(),
          },
        },
      });

      // 2. Actualizar o crear los créditos de la organización
      const existingCredit = await tx.schoolCredit.findFirst({
        where: {
          organizationId: order.organizationId,
          planType: order.tier as any,
          isActive: true,
        },
      });

      let updatedCredit;
      if (existingCredit) {
        // Actualizar crédito existente
        updatedCredit = await tx.schoolCredit.update({
          where: { id: existingCredit.id },
          data: {
            totalPurchased: {
              increment: order.quantity,
            },
            totalPaid: {
              increment: order.amount,
            },
          },
        });
      } else {
        // Crear nuevo registro de crédito
        updatedCredit = await tx.schoolCredit.create({
          data: {
            organizationId: order.organizationId,
            planType: order.tier as any,
            totalPurchased: order.quantity,
            totalPaid: order.amount,
            unitPrice: order.amount / order.quantity,
            isActive: true,
          },
        });
      }

      // 3. Los códigos se pueden generar después por el coordinador
      // Por ahora solo actualizamos los créditos disponibles
      
      return {
        order: updatedOrder,
        credit: updatedCredit,
        codesCreated: 0, // Los códigos los generará el coordinador cuando los necesite
      };
    });

    logger.debug(`✅ Pago confirmado exitosamente`);
    logger.debug(`   📊 Créditos comprados ahora: ${result.credit.totalPurchased}`);
    logger.debug(`   💳 Los códigos de licencia serán generados por el coordinador cuando los necesite`);

    return NextResponse.json({
      success: true,
      message: 'Pago confirmado y créditos actualizados exitosamente',
      order: result.order,
      creditsAdded: order.quantity,
    });
  } catch (error) {
    logger.error('❌ Error al confirmar pago:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la confirmación de pago',
      },
      { status: 500 }
    );
  }
}
