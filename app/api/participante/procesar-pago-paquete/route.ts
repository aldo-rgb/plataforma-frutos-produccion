import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/participante/procesar-pago-paquete
 * 
 * Procesa el pago de un paquete de mentorías y genera las URLs de pasarela
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { ordenId, metodoPago, amount } = body;

    if (!ordenId || !metodoPago || !amount) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener la orden
    const orden = await prisma.mentorPackageOrder.findUnique({
      where: { id: ordenId },
      include: {
        Usuario: true,
        Mentor: true,
      },
    });

    if (!orden) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (orden.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'La orden ya fue procesada' },
        { status: 400 }
      );
    }

    let paymentUrl = '';

    // Generar URL de pago según el método
    switch (metodoPago) {
      case 'paypal':
        paymentUrl = await createPayPalOrder(ordenId, amount);
        break;
      case 'stripe':
        paymentUrl = await createStripeCheckout(ordenId, amount);
        break;
      case 'mercadopago':
        paymentUrl = await createMercadoPagoPreference(ordenId, amount);
        break;
      default:
        return NextResponse.json(
          { error: 'Método de pago no válido' },
          { status: 400 }
        );
    }

    // Actualizar orden con URL de pago
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: {
        paymentUrl: paymentUrl,
        updatedAt: new Date(),
      },
    });

    logger.debug(`✅ URL de pago generada para orden ${ordenId}`);
    logger.debug(`   Método: ${metodoPago}`);
    logger.debug(`   Monto: $${amount}`);

    return NextResponse.json({
      success: true,
      paymentUrl,
      ordenId,
    });
  } catch (error: any) {
    logger.error('❌ Error al procesar pago de paquete:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar el pago',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// INTEGRACIÓN CON PASARELAS DE PAGO
// ============================================================================

async function createPayPalOrder(ordenId: string, amount: number): Promise<string> {
  try {
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
    const PAYPAL_API_URL =
      process.env.PAYPAL_MODE === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      throw new Error('PayPal credentials not configured');
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

    // Convertir MXN a USD (aproximado)
    const amountUSD = (amount / 20).toFixed(2);

    // Crear orden
    const orderRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: ordenId,
            amount: {
              currency_code: 'USD',
              value: amountUSD,
            },
            description: `Paquete de 18 Sesiones de Mentoría - Orden ${ordenId}`,
          },
        ],
        application_context: {
          return_url: `${process.env.NEXTAUTH_URL}/api/participante/payment-success?orderId=${ordenId}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/participante?payment=cancelled`,
        },
      }),
    });

    const orderData = await orderRes.json();

    if (!orderData.id) {
      throw new Error('PayPal order creation failed');
    }

    // Actualizar orden con externalPaymentId
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: { externalPaymentId: orderData.id },
    });

    // Retornar URL de aprobación
    const approveLink = orderData.links.find((link: any) => link.rel === 'approve');
    return approveLink?.href || '';
  } catch (error: any) {
    logger.error('PayPal error:', error);
    throw error;
  }
}

async function createStripeCheckout(ordenId: string, amount: number): Promise<string> {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe credentials not configured');
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Paquete de 18 Sesiones de Mentoría',
              description: `Orden ${ordenId}`,
            },
            unit_amount: amount * 100, // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/api/participante/payment-success?orderId=${ordenId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/participante?payment=cancelled`,
      metadata: {
        ordenId: ordenId,
      },
    });

    // Actualizar orden con externalPaymentId
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: { externalPaymentId: session.id },
    });

    return session.url || '';
  } catch (error: any) {
    logger.error('Stripe error:', error);
    throw error;
  }
}

async function createMercadoPagoPreference(ordenId: string, amount: number): Promise<string> {
  try {
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      throw new Error('Mercado Pago credentials not configured');
    }

    const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: 'Paquete de 18 Sesiones de Mentoría',
            description: `Orden ${ordenId}`,
            quantity: 1,
            currency_id: 'MXN',
            unit_price: amount,
          },
        ],
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/api/participante/payment-success?orderId=${ordenId}`,
          failure: `${process.env.NEXTAUTH_URL}/dashboard/participante?payment=failed`,
          pending: `${process.env.NEXTAUTH_URL}/dashboard/participante?payment=pending`,
        },
        auto_return: 'approved',
        external_reference: ordenId,
      }),
    });

    const preferenceData = await preferenceRes.json();

    if (!preferenceData.id) {
      throw new Error('Mercado Pago preference creation failed');
    }

    // Actualizar orden con externalPaymentId
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: { externalPaymentId: preferenceData.id },
    });

    return preferenceData.init_point || '';
  } catch (error: any) {
    logger.error('Mercado Pago error:', error);
    throw error;
  }
}
