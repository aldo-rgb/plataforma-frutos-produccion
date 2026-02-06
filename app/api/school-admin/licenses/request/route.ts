import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

const TIER_PRICES = {
  STANDARD: 50,
  PREMIUM: 100,
  ELITE: 200,
};

const MIN_LICENSES = 50;

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
    const { quantity, tier, paymentMethod, organizationId } = body;

    // Validaciones
    if (quantity < MIN_LICENSES) {
      return NextResponse.json(
        { error: `La cantidad mínima es ${MIN_LICENSES} licencias` },
        { status: 400 }
      );
    }

    if (!['STANDARD', 'PREMIUM', 'ELITE'].includes(tier)) {
      return NextResponse.json({ error: 'Tipo de plan inválido' }, { status: 400 });
    }

    if (!['paypal', 'stripe', 'mercadopago'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    if (organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Organización no autorizada' }, { status: 403 });
    }

    // Calcular total
    const amount = quantity * TIER_PRICES[tier as keyof typeof TIER_PRICES];

    // Crear orden en la base de datos
    const order = await prisma.licenseOrder.create({
      data: {
        organizationId: user.organizationId,
        requestedBy: user.id,
        quantity,
        tier,
        amount,
        paymentMethod,
        status: 'PENDING',
      },
    });

    // Generar URL de pago según el método
    let paymentUrl = '';

    switch (paymentMethod) {
      case 'paypal':
        paymentUrl = await createPayPalOrder(order.id, amount);
        break;
      case 'stripe':
        paymentUrl = await createStripeCheckout(order.id, amount);
        break;
      case 'mercadopago':
        paymentUrl = await createMercadoPagoPreference(order.id, amount);
        break;
    }

    // Actualizar orden con la URL de pago
    await prisma.licenseOrder.update({
      where: { id: order.id },
      data: { paymentUrl },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentUrl,
      amount,
    });
  } catch (error: any) {
    logger.error('❌ Error creating license order:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PAYPAL INTEGRATION
// ============================================================================
async function createPayPalOrder(orderId: string, amount: number): Promise<string> {
  try {
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
    const PAYPAL_API_URL = process.env.PAYPAL_MODE === 'production'
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
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Crear orden
    const orderRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
            description: `Licencias Plataforma Frutos - Orden ${orderId}`,
          },
        ],
        application_context: {
          return_url: `${process.env.NEXTAUTH_URL}/api/school-admin/licenses/payment/success?orderId=${orderId}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/school-admin/licenses/request?canceled=true`,
          brand_name: 'Plataforma Frutos',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const orderData = await orderRes.json();

    if (!orderData.id) {
      throw new Error('PayPal order creation failed');
    }

    // Guardar PayPal Order ID
    await prisma.licenseOrder.update({
      where: { id: orderId },
      data: { externalPaymentId: orderData.id },
    });

    // Obtener approve URL
    const approveLink = orderData.links.find((link: any) => link.rel === 'approve');
    return approveLink?.href || '';
  } catch (error) {
    logger.error('PayPal error:', error);
    throw error;
  }
}

// ============================================================================
// STRIPE INTEGRATION
// ============================================================================
async function createStripeCheckout(orderId: string, amount: number): Promise<string> {
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
            currency: 'usd',
            product_data: {
              name: 'Licencias Plataforma Frutos',
              description: `Orden ${orderId}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/api/school-admin/licenses/payment/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/school-admin/licenses/request?canceled=true`,
      client_reference_id: orderId,
      metadata: {
        orderId,
      },
    });

    // Guardar Stripe Session ID
    await prisma.licenseOrder.update({
      where: { id: orderId },
      data: { externalPaymentId: session.id },
    });

    return session.url || '';
  } catch (error) {
    logger.error('Stripe error:', error);
    throw error;
  }
}

// ============================================================================
// MERCADO PAGO INTEGRATION
// ============================================================================
async function createMercadoPagoPreference(orderId: string, amount: number): Promise<string> {
  try {
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      throw new Error('Mercado Pago credentials not configured');
    }

    const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: 'Licencias Plataforma Frutos',
            description: `Orden ${orderId}`,
            quantity: 1,
            currency_id: 'USD',
            unit_price: amount,
          },
        ],
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/api/school-admin/licenses/payment/success?orderId=${orderId}`,
          failure: `${process.env.NEXTAUTH_URL}/dashboard/school-admin/licenses/request?failed=true`,
          pending: `${process.env.NEXTAUTH_URL}/dashboard/school-admin/licenses/request?pending=true`,
        },
        auto_return: 'approved',
        external_reference: orderId,
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
      }),
    });

    const preferenceData = await preferenceRes.json();

    if (!preferenceData.id) {
      throw new Error('Mercado Pago preference creation failed');
    }

    // Guardar Mercado Pago Preference ID
    await prisma.licenseOrder.update({
      where: { id: orderId },
      data: { externalPaymentId: preferenceData.id },
    });

    return preferenceData.init_point || '';
  } catch (error) {
    logger.error('Mercado Pago error:', error);
    throw error;
  }
}
