import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getPaymentGateway } from '@/lib/payment-gateway';

/**
 * GET /api/school-admin/visiones/mp-success
 * 
 * Callback de éxito de MercadoPago - Procesa el pago y asigna mentores
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    logger.debug('🟢 [MP-SUCCESS] Procesando callback:', { 
      orderId, 
      paymentId, 
      status, 
      externalReference 
    });

    // Usar orderId o external_reference
    const orderIdToUse = orderId || externalReference;

    if (!orderIdToUse) {
      logger.debug('❌ [MP-SUCCESS] Parámetros faltantes');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=missing_params`
      );
    }

    // Verificar el pago con MercadoPago si tenemos paymentId
    if (paymentId) {
      const gateway = await getPaymentGateway(null, 'mercadopago');
      
      if (gateway && gateway.provider === 'mercadopago') {
        try {
          const { MercadoPagoConfig, Payment } = require('mercadopago');
          const client = new MercadoPagoConfig({ accessToken: gateway.secretKey });
          const payment = new Payment(client);
          
          const paymentInfo = await payment.get({ id: paymentId });
          
          logger.debug('🟢 [MP-SUCCESS] Info del pago:', {
            id: paymentInfo.id,
            status: paymentInfo.status,
            status_detail: paymentInfo.status_detail,
          });

          if (paymentInfo.status !== 'approved') {
            logger.debug('❌ [MP-SUCCESS] Pago no aprobado:', paymentInfo.status);
            return NextResponse.redirect(
              `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=payment_not_approved&status=${paymentInfo.status}`
            );
          }
        } catch (mpError: any) {
          logger.error('⚠️ [MP-SUCCESS] Error verificando pago (continuando):', mpError.message);
          // Continuar de todos modos si el status es 'approved'
        }
      }
    }

    // Si el status no es approved, rechazar
    if (status && status !== 'approved') {
      logger.debug('❌ [MP-SUCCESS] Status no aprobado:', status);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=payment_${status}`
      );
    }

    // Obtener la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderIdToUse },
    });

    if (!order) {
      logger.debug('❌ [MP-SUCCESS] Orden no encontrada');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=order_not_found`
      );
    }

    if (order.status === 'COMPLETED') {
      logger.debug('ℹ️ [MP-SUCCESS] Orden ya procesada, redirigiendo...');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=success`
      );
    }

    // Parsear paymentData
    let paymentData: any = {};
    try {
      if (order.paymentData) {
        paymentData = typeof order.paymentData === 'string'
          ? JSON.parse(order.paymentData)
          : order.paymentData;
      }
    } catch (e) {
      logger.error('Error parseando paymentData:', e);
    }

    // Obtener el usuario de la organización para la asignación
    const orgUser = await prisma.usuario.findFirst({
      where: {
        organizationId: order.organizationId,
        rol: 'SCHOOL_ADMIN',
      },
      select: { id: true },
    });

    // Actualizar orden como completada
    const updatedOrder = await prisma.licenseOrder.update({
      where: { id: orderIdToUse },
      data: {
        status: 'COMPLETED',
        paymentMethod: 'mercadopago',
        paidAt: new Date(),
        paymentData: {
          ...paymentData,
          method: 'mercadopago',
          status: 'completed',
          paidAt: new Date().toISOString(),
          mpPaymentId: paymentId,
          transactionId: `MP-${paymentId || orderIdToUse.slice(-12)}`,
        },
      },
    });

    logger.debug('✅ [MP-SUCCESS] Orden actualizada:', updatedOrder.id);

    // Procesar asignaciones de mentores
    if (paymentData.type === 'VISION_MENTOR_PAYMENT') {
      const visionId = paymentData.visionId;
      const mentorAssignments = paymentData.mentorAssignments || [];
      const totalStudents = paymentData.totalStudents || 0;

      logger.debug('📋 [MP-SUCCESS] Procesando asignaciones:', {
        visionId,
        mentorAssignments: mentorAssignments.length,
        totalStudents,
      });

      // 1. Asignar cada mentor a la visión
      for (const assignment of mentorAssignments) {
        const { mentorId } = assignment;

        const existingAssignment = await prisma.visionMentor.findFirst({
          where: { visionId, mentorId },
        });

        if (!existingAssignment) {
          const assignerId = orgUser?.id || mentorId;
          
          await prisma.visionMentor.create({
            data: {
              visionId: visionId,
              mentorId: mentorId,
              asignadoPorId: assignerId,
            },
          });
          logger.debug(`✅ Mentor ${mentorId} asignado a visión ${visionId}`);
        }
      }

      // 2. Acreditar llamadas a la organización
      const callsPerStudent = 18;
      const totalCalls = totalStudents * callsPerStudent;

      logger.debug('💰 [MP-SUCCESS] Acreditando llamadas:', {
        totalStudents,
        callsPerStudent,
        totalCalls,
      });

      // Buscar o crear registro de créditos de la organización
      let schoolCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: order.organizationId,
          isActive: true,
        },
      });

      if (schoolCredit) {
        schoolCredit = await prisma.schoolCredit.update({
          where: { id: schoolCredit.id },
          data: {
            totalPurchased: schoolCredit.totalPurchased + totalCalls,
            totalPaid: schoolCredit.totalPaid + order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          },
        });
      } else {
        schoolCredit = await prisma.schoolCredit.create({
          data: {
            organizationId: order.organizationId,
            planType: 'STANDARD',
            totalPurchased: totalCalls,
            totalAllocated: 0,
            unitPrice: order.amount / totalCalls,
            totalPaid: order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            notes: `MercadoPago - Mentorías visión ${visionId} - Orden ${orderIdToUse}`,
            updatedAt: new Date(),
          },
        });
      }

      logger.debug(`✅ ${totalCalls} llamadas acreditadas a organización ${order.organizationId}`);
    }

    logger.debug('✅ [MP-SUCCESS] Proceso completado, redirigiendo a dashboard...');

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=success`
    );

  } catch (error: any) {
    logger.error('❌ [MP-SUCCESS] Error general:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=server_error`
    );
  }
}
