import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const sessionId = searchParams.get('session_id'); // Stripe
  const paymentId = searchParams.get('payment_id'); // Mercado Pago
  const payerId = searchParams.get('PayerID'); // PayPal

  if (!orderId) {
    return NextResponse.redirect(new URL('/dashboard/school-admin?error=missing_order', req.url));
  }

  try {
    // Buscar la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: true,
      },
    });

    if (!order) {
      return NextResponse.redirect(new URL('/dashboard/school-admin?error=order_not_found', req.url));
    }

    // Si ya fue procesada, redirigir
    if (order.status === 'COMPLETED') {
      return NextResponse.redirect(new URL('/dashboard/school-admin?success=already_processed', req.url));
    }

    // Verificar el pago según la pasarela
    let paymentVerified = false;
    let paymentData: any = {};

    switch (order.paymentMethod) {
      case 'paypal':
        paymentVerified = await verifyPayPalPayment(order.externalPaymentId!, payerId);
        paymentData = { payerId, externalPaymentId: order.externalPaymentId };
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
      await prisma.licenseOrder.update({
        where: { id: orderId },
        data: { status: 'FAILED' },
      });
      return NextResponse.redirect(new URL('/dashboard/school-admin?error=payment_failed', req.url));
    }

    // ✅ GENERAR CRÉDITOS AUTOMÁTICAMENTE
    await generateCreditsForOrder(order);

    // Actualizar estado de la orden
    await prisma.licenseOrder.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        paymentData,
        creditsGenerated: true,
        creditsGeneratedAt: new Date(),
      },
    });

    // Redirigir con éxito
    return NextResponse.redirect(
      new URL(`/dashboard/school-admin?success=true&quantity=${order.quantity}&tier=${order.tier}`, req.url)
    );
  } catch (error: any) {
    console.error('❌ Error processing payment success:', error);
    return NextResponse.redirect(new URL('/dashboard/school-admin?error=processing_failed', req.url));
  }
}

// ============================================================================
// FUNCIÓN PARA GENERAR CRÉDITOS AUTOMÁTICAMENTE
// ============================================================================
async function generateCreditsForOrder(order: any) {
  try {
    // Crear créditos en SchoolCredit
    await prisma.schoolCredit.create({
      data: {
        organizationId: order.organizationId,
        planType: order.tier,
        totalPurchased: order.quantity,
        totalAllocated: 0, // No se han convertido en licencias aún
        unitPrice: order.amount / order.quantity,
        totalPaid: order.amount,
        isActive: true,
        paymentMethod: order.paymentMethod,
        notes: `Compra automática - Orden ${order.id}`,
      },
    });

    console.log(`✅ Créditos generados: ${order.quantity} licencias ${order.tier} para organización ${order.organizationId}`);
  } catch (error) {
    console.error('❌ Error generando créditos:', error);
    throw error;
  }
}

// ============================================================================
// VERIFICACIÓN DE PAGOS POR PASARELA
// ============================================================================
async function verifyPayPalPayment(orderId: string, payerId: string | null): Promise<boolean> {
  try {
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
    const PAYPAL_API_URL = process.env.PAYPAL_MODE === 'production'
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
        'Authorization': `Basic ${auth}`,
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
        'Authorization': `Bearer ${accessToken}`,
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

async function verifyMercadoPagoPayment(paymentId: string): Promise<boolean> {
  try {
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      return false;
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    const paymentData = await paymentRes.json();
    return paymentData.status === 'approved';
  } catch (error) {
    console.error('Mercado Pago verification error:', error);
    return false;
  }
}
