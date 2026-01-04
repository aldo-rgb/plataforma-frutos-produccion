import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { onPackagePurchaseCompleted } from '@/lib/commissionCalculator';
import { createPackageCredits } from '@/lib/packageSessionManager';

/**
 * GET /api/participante/payment-success
 * 
 * Endpoint de confirmación de pago exitoso
 * Redirige desde las pasarelas de pago (PayPal, Stripe, MercadoPago)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ordenId = searchParams.get('orderId');
    const sessionId = searchParams.get('session_id'); // Stripe
    const paymentId = searchParams.get('payment_id'); // MercadoPago
    const payerId = searchParams.get('PayerID'); // PayPal

    if (!ordenId) {
      return NextResponse.redirect(
        new URL('/dashboard/participante?error=orden-invalida', request.url)
      );
    }

    // Obtener la orden
    const orden = await prisma.mentorPackageOrder.findUnique({
      where: { id: ordenId },
      include: {
        Usuario: true,
        Mentor: true,
        Vision: true,
      },
    });

    if (!orden) {
      return NextResponse.redirect(
        new URL('/dashboard/participante?error=orden-no-encontrada', request.url)
      );
    }

    // Si ya fue procesada, redirigir
    if (orden.status === 'COMPLETED') {
      return NextResponse.redirect(
        new URL('/dashboard/participante?success=ya-procesado', request.url)
      );
    }

    // Verificar el pago según la pasarela
    let paymentVerified = false;
    let paymentData: any = {};

    switch (orden.metodoPago) {
      case 'paypal':
        paymentVerified = await verifyPayPalPayment(orden.externalPaymentId!, payerId);
        paymentData = { payerId, externalPaymentId: orden.externalPaymentId };
        break;
      case 'stripe':
        paymentVerified = await verifyStripePayment(sessionId!);
        paymentData = { sessionId };
        break;
      case 'mercadopago':
        paymentVerified = await verifyMercadoPagoPayment(paymentId!);
        paymentData = { paymentId };
        break;
    }

    if (!paymentVerified) {
      await prisma.mentorPackageOrder.update({
        where: { id: ordenId },
        data: { status: 'FAILED' },
      });
      return NextResponse.redirect(
        new URL('/dashboard/participante?error=pago-fallido', request.url)
      );
    }

    // Actualizar orden como COMPLETED
    const ordenActualizada = await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        paymentData: paymentData,
      },
    });

    console.log(`✅ Pago verificado y completado para orden ${ordenId}`);
    console.log(`   Usuario: ${orden.Usuario.nombre}`);
    console.log(`   Mentor: ${orden.Mentor.nombre}`);
    console.log(`   Monto: $${orden.precioTotal} ${orden.currency}`);

    // 💰 COMISIÓN SE REGISTRA POR CADA SESIÓN COMPLETADA
    // Las comisiones NO se registran al comprar el paquete
    // Se crearán automáticamente cuando el mentor complete cada sesión ($90 por sesión)
    console.log(`💰 Comisión se registrará conforme se completen las ${orden.cantidad} sesiones`);
    
    // DESACTIVADO: No registrar comisión anticipada
    // try {
    //   await onPackagePurchaseCompleted(
    //     ordenId,
    //     orden.mentorId,
    //     orden.usuarioId,
    //     orden.Usuario.nombre,
    //     orden.precioTotal,
    //     orden.cantidad,
    //     new Date()
    //   );
    //   console.log(`💰 Comisión registrada en ledger para paquete ${ordenId}`);
    // } catch (error) {
    //   console.error(`⚠️ Error al registrar comisión (no crítico):`, error);
    // }

    // 💳 CREAR CRÉDITOS DE SESIONES
    try {
      // Calcular expiración a 6 meses (opcional)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      await createPackageCredits(ordenId, orden.cantidad, expiresAt);
      console.log(`💳 Créditos creados: ${orden.cantidad} sesiones disponibles`);
    } catch (error) {
      console.error(`⚠️ Error al crear créditos (no crítico):`, error);
      // No detenemos el flujo, los créditos se pueden crear manualmente
    }

    // Asignar el mentor al usuario en la visión
    await assignMentorToUser(orden.usuarioId, orden.mentorId, orden.visionId);

    // Redirigir al dashboard con mensaje de éxito
    return NextResponse.redirect(
      new URL(
        `/dashboard/participante?success=paquete-comprado&mentor=${encodeURIComponent(orden.Mentor.nombre)}`,
        request.url
      )
    );
  } catch (error: any) {
    console.error('❌ Error al procesar confirmación de pago:', error);
    return NextResponse.redirect(
      new URL('/dashboard/participante?error=error-procesamiento', request.url)
    );
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Asigna el mentor al usuario en la visión especificada
 */
async function assignMentorToUser(usuarioId: number, mentorId: number, visionId: number) {
  try {
    // Actualizar el assignedMentorId del usuario
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { assignedMentorId: mentorId },
    });

    // Crear o actualizar el enrollment del usuario
    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: usuarioId,
        visionId: visionId,
      },
    });

    if (existingEnrollment) {
      // Actualizar enrollment existente
      await prisma.programEnrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          mentorId: mentorId,
          updatedAt: new Date(),
        },
      });
    } else {
      // Crear nuevo enrollment
      await prisma.programEnrollment.create({
        data: {
          userId: usuarioId,
          mentorId: mentorId,
          visionId: visionId,
          cycleType: 'BIMESTRE',
          status: 'ACTIVE',
        },
      });
    }

    console.log(`✅ Mentor ${mentorId} asignado al usuario ${usuarioId} en visión ${visionId}`);
  } catch (error) {
    console.error('❌ Error al asignar mentor:', error);
    throw error;
  }
}

/**
 * Verifica el pago de PayPal
 */
async function verifyPayPalPayment(orderId: string, payerId: string | null): Promise<boolean> {
  try {
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
    const PAYPAL_API_URL =
      process.env.PAYPAL_MODE === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET || !payerId) {
      return false;
    }

    // Obtener access token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Capturar el pago
    const captureRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();
    return captureData.status === 'COMPLETED';
  } catch (error) {
    console.error('PayPal verification error:', error);
    return false;
  }
}

/**
 * Verifica el pago de Stripe
 */
async function verifyStripePayment(sessionId: string): Promise<boolean> {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      return false;
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return session.payment_status === 'paid';
  } catch (error) {
    console.error('Stripe verification error:', error);
    return false;
  }
}

/**
 * Verifica el pago de Mercado Pago
 */
async function verifyMercadoPagoPayment(paymentId: string): Promise<boolean> {
  try {
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      return false;
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    const paymentData = await paymentRes.json();
    return paymentData.status === 'approved';
  } catch (error) {
    console.error('Mercado Pago verification error:', error);
    return false;
  }
}
