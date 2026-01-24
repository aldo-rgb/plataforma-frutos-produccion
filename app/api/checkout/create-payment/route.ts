import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/checkout/create-payment
 * 
 * Crea una orden de pago para el REGISTRO (BÁSICO) usando la pasarela configurada por la organización
 * Soporta: MERCADOPAGO, STRIPE, PAYPAL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      organizationId,
      visionId,
      amount,
      ticketSelection, // 'BASIC_ONLY' | 'FULL_VISION'
      userData, // { nombre, email, apodo, telefono }
      appliedCodes = [],
    } = body;

    if (!organizationId || !amount || !userData?.email) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener configuración de pasarela de pago de la organización
    const gatewayConfig = await prisma.paymentGatewayConfig.findUnique({
      where: { organizationId: organizationId },
    });

    if (!gatewayConfig || !gatewayConfig.isActive) {
      return NextResponse.json(
        { error: 'La organización no tiene configurada una pasarela de pago. Contacta al administrador.' },
        { status: 400 }
      );
    }

    if (!gatewayConfig.secretKey) {
      return NextResponse.json(
        { error: 'La pasarela de pago no tiene credenciales configuradas' },
        { status: 400 }
      );
    }

    // Obtener datos de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Generar título del producto
    let productTitle = '';
    let productDescription = '';
    
    if (ticketSelection === 'FULL_VISION') {
      productTitle = 'Visión Completa - Básico + Avanzado + PL';
      productDescription = `Inscripción Visión Completa en ${organization.name} - Frutos del Espíritu`;
    } else {
      productTitle = 'Entrenamiento Básico';
      productDescription = `Inscripción al Entrenamiento Básico en ${organization.name} - Frutos del Espíritu`;
    }

    const orderData = {
      organizationId,
      visionId,
      ticketSelection,
      amount,
      userData,
      appliedCodes,
      productTitle,
      productDescription,
      type: 'REGISTRATION', // Para identificar que es un registro
    };

    let paymentUrl = '';

    // Crear pago según la pasarela configurada
    switch (gatewayConfig.provider.toUpperCase()) {
      case 'MERCADOPAGO':
        paymentUrl = await createMercadoPagoPreference(
          gatewayConfig.secretKey,
          orderData,
          userData,
          productTitle,
          productDescription,
          amount
        );
        break;
      
      case 'STRIPE':
        paymentUrl = await createStripeCheckout(
          gatewayConfig.secretKey,
          orderData,
          userData,
          productTitle,
          productDescription,
          amount
        );
        break;
      
      case 'PAYPAL':
        paymentUrl = await createPayPalOrder(
          gatewayConfig.secretKey,
          gatewayConfig.publicKey || '',
          orderData,
          userData,
          productTitle,
          productDescription,
          amount
        );
        break;
      
      default:
        return NextResponse.json(
          { error: `Pasarela de pago no soportada: ${gatewayConfig.provider}` },
          { status: 400 }
        );
    }

    if (!paymentUrl) {
      throw new Error('No se pudo generar la URL de pago');
    }

    console.log(`✅ Pago de registro creado`);
    console.log(`   Pasarela: ${gatewayConfig.provider}`);
    console.log(`   Ticket: ${ticketSelection}`);
    console.log(`   Monto: $${amount} MXN`);

    return NextResponse.json({
      success: true,
      paymentUrl,
      provider: gatewayConfig.provider,
    });

  } catch (error: any) {
    console.error('❌ Error al crear pago de registro:', error);
    return NextResponse.json(
      {
        error: 'Error al crear el pago',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// MERCADO PAGO
// ============================================================================
async function createMercadoPagoPreference(
  accessToken: string,
  orderData: any,
  userData: any,
  productTitle: string,
  productDescription: string,
  amount: number
): Promise<string> {
  const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          title: productTitle,
          description: productDescription,
          quantity: 1,
          currency_id: 'MXN',
          unit_price: amount,
        },
      ],
      payer: {
        name: userData.nombre || '',
        email: userData.email || '',
      },
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/api/checkout/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}`,
        failure: `${process.env.NEXTAUTH_URL}/checkout?payment=failed`,
        pending: `${process.env.NEXTAUTH_URL}/checkout?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        type: 'REGISTRATION',
        organizationId: orderData.organizationId,
        ticketSelection: orderData.ticketSelection,
      }),
      metadata: orderData,
    }),
  });

  if (!preferenceRes.ok) {
    const errorData = await preferenceRes.json();
    console.error('Error de Mercado Pago:', errorData);
    throw new Error('Error al crear preferencia en Mercado Pago');
  }

  const preferenceData = await preferenceRes.json();

  if (!preferenceData.init_point) {
    throw new Error('Mercado Pago no devolvió URL de pago');
  }

  return preferenceData.init_point;
}

// ============================================================================
// STRIPE
// ============================================================================
async function createStripeCheckout(
  secretKey: string,
  orderData: any,
  userData: any,
  productTitle: string,
  productDescription: string,
  amount: number
): Promise<string> {
  const Stripe = require('stripe');
  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: productTitle,
            description: productDescription,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: userData.email,
    success_url: `${process.env.NEXTAUTH_URL}/api/checkout/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/checkout?payment=cancelled`,
    metadata: {
      type: 'REGISTRATION',
      organizationId: orderData.organizationId.toString(),
      ticketSelection: orderData.ticketSelection,
    },
  });

  return session.url || '';
}

// ============================================================================
// PAYPAL
// ============================================================================
async function createPayPalOrder(
  clientSecret: string,
  clientId: string,
  orderData: any,
  userData: any,
  productTitle: string,
  productDescription: string,
  amount: number
): Promise<string> {
  // Obtener access token de PayPal
  const authRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!authRes.ok) {
    throw new Error('Error al autenticar con PayPal');
  }

  const authData = await authRes.json();
  const accessToken = authData.access_token;

  // Crear orden en PayPal
  const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'MXN',
            value: amount.toFixed(2),
          },
          description: productTitle,
          custom_id: JSON.stringify({
            type: 'REGISTRATION',
            organizationId: orderData.organizationId,
            ticketSelection: orderData.ticketSelection,
          }),
        },
      ],
      application_context: {
        brand_name: 'Frutos del Espíritu',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXTAUTH_URL}/api/checkout/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/checkout?payment=cancelled`,
      },
    }),
  });

  if (!orderRes.ok) {
    const errorData = await orderRes.json();
    console.error('Error de PayPal:', errorData);
    throw new Error('Error al crear orden en PayPal');
  }

  const orderDataRes = await orderRes.json();
  
  const approvalLink = orderDataRes.links?.find((link: any) => link.rel === 'approve');
  
  if (!approvalLink?.href) {
    throw new Error('PayPal no devolvió URL de aprobación');
  }

  return approvalLink.href;
}
