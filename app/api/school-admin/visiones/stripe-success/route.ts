import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Inicializar Stripe si hay key
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
}

/**
 * GET /api/school-admin/visiones/stripe-success
 * 
 * Callback de éxito de Stripe - Procesa el pago y asigna mentores
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('orderId');

    console.log('🔵 [STRIPE-SUCCESS] Procesando callback:', { sessionId, orderId });

    if (!sessionId || !orderId) {
      console.log('❌ [STRIPE-SUCCESS] Parámetros faltantes');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=missing_params`
      );
    }

    if (!stripe) {
      console.log('❌ [STRIPE-SUCCESS] Stripe no configurado');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=stripe_not_configured`
      );
    }

    // Verificar la sesión de Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('🔵 [STRIPE-SUCCESS] Sesión de Stripe:', {
      id: stripeSession.id,
      payment_status: stripeSession.payment_status,
      amount_total: stripeSession.amount_total,
    });

    if (stripeSession.payment_status !== 'paid') {
      console.log('❌ [STRIPE-SUCCESS] Pago no completado');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=payment_not_completed`
      );
    }

    // Obtener la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      console.log('❌ [STRIPE-SUCCESS] Orden no encontrada');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=order_not_found`
      );
    }

    if (order.status === 'COMPLETED') {
      console.log('ℹ️ [STRIPE-SUCCESS] Orden ya procesada, redirigiendo...');
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
      console.error('Error parseando paymentData:', e);
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
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        paymentMethod: 'stripe',
        paidAt: new Date(),
        paymentData: {
          ...paymentData,
          method: 'stripe',
          status: 'completed',
          paidAt: new Date().toISOString(),
          stripeSessionId: sessionId,
          stripePaymentIntent: stripeSession.payment_intent,
          transactionId: `STRIPE-${sessionId.slice(-12)}`,
        },
      },
    });

    console.log('✅ [STRIPE-SUCCESS] Orden actualizada:', updatedOrder.id);

    // Procesar asignaciones de mentores
    if (paymentData.type === 'VISION_MENTOR_PAYMENT') {
      const visionId = paymentData.visionId;
      const mentorAssignments = paymentData.mentorAssignments || [];
      const totalStudents = paymentData.totalStudents || 0;

      console.log('📋 [STRIPE-SUCCESS] Procesando asignaciones:', {
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
          // Necesitamos un asignadoPorId válido
          const assignerId = orgUser?.id || mentorId; // Usar el mentorId como fallback
          
          await prisma.visionMentor.create({
            data: {
              visionId: visionId,
              mentorId: mentorId,
              asignadoPorId: assignerId,
            },
          });
          console.log(`✅ Mentor ${mentorId} asignado a visión ${visionId}`);
        }
      }

      // 2. Acreditar llamadas a la organización
      const callsPerStudent = 18;
      const totalCalls = totalStudents * callsPerStudent;

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
            notes: `Stripe - Mentorías visión ${visionId} - Orden ${orderId}`,
            updatedAt: new Date(),
          },
        });
      }

      console.log('✅ [STRIPE-SUCCESS] Llamadas acreditadas:', totalCalls);
    }

    // Redirigir a página de éxito
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=success`
    );

  } catch (error: any) {
    console.error('❌ [STRIPE-SUCCESS] Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones?payment=error&reason=${encodeURIComponent(error.message)}`
    );
  }
}
