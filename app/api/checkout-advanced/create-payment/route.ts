import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/checkout-advanced/create-payment
 * 
 * Crea una orden de pago para AVANZADO/PL usando la pasarela configurada por la organización
 * Soporta: MERCADOPAGO, STRIPE, PAYPAL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    
    const { 
      visionId, 
      organizationId, 
      packageType, 
      amount, 
      pendingDebt,
      prices,
      appliedCodes = [],
    } = body;

    if (!visionId || !organizationId || !packageType || !amount) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener visión y organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { id: true, nombre: true, organizationId: true },
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Obtener configuración de pasarela de pago de la organización
    const gatewayConfig = await prisma.paymentGatewayConfig.findUnique({
      where: { organizationId: organizationId },
    });

    if (!gatewayConfig || !gatewayConfig.isActive) {
      return NextResponse.json(
        { error: 'La organización no tiene configurada una pasarela de pago' },
        { status: 400 }
      );
    }

    if (!gatewayConfig.secretKey) {
      return NextResponse.json(
        { error: 'La pasarela de pago no tiene credenciales configuradas' },
        { status: 400 }
      );
    }

    // Generar título del producto según el tipo de paquete
    let productTitle = '';
    let productDescription = '';
    
    switch (packageType) {
      case 'ADVANCED_ONLY':
        productTitle = 'Entrenamiento Avanzado';
        productDescription = 'Inscripción al Entrenamiento Avanzado - Frutos del Espíritu';
        break;
      case 'COMBO':
        productTitle = 'Combo Avanzado + Tu VIDA (PL)';
        productDescription = 'Inscripción Avanzado + Participación Libre - Frutos del Espíritu';
        break;
      case 'APARTADO':
        productTitle = 'Apartado Avanzado + Tu VIDA (PL)';
        productDescription = 'Apartado para Combo Avanzado + PL - Frutos del Espíritu';
        break;
      case 'PL_BASE':
      case 'PL_CON_CREDITO':
        productTitle = 'Tu VIDA (Participación Libre)';
        productDescription = 'Inscripción a Participación Libre - Frutos del Espíritu';
        break;
      default:
        productTitle = 'Inscripción Frutos del Espíritu';
        productDescription = 'Pago de inscripción';
    }

    const orderData = {
      userId,
      visionId,
      organizationId,
      packageType,
      amount,
      pendingDebt: pendingDebt || 0,
      prices,
      appliedCodes,
      productTitle,
      productDescription,
    };

    let paymentUrl = '';

    // Crear pago según la pasarela configurada por la organización
    switch (gatewayConfig.provider.toUpperCase()) {
      case 'MERCADOPAGO':
        paymentUrl = await createMercadoPagoPreference(
          gatewayConfig.secretKey,
          orderData,
          user,
          productTitle,
          productDescription,
          amount
        );
        break;
      
      case 'STRIPE':
        paymentUrl = await createStripeCheckout(
          gatewayConfig.secretKey,
          orderData,
          user,
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
          user,
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

    console.log(`✅ Pago creado para usuario ${userId}`);
    console.log(`   Pasarela: ${gatewayConfig.provider}`);
    console.log(`   Paquete: ${packageType}`);
    console.log(`   Monto: $${amount} MXN`);

    return NextResponse.json({
      success: true,
      paymentUrl,
      provider: gatewayConfig.provider,
    });

  } catch (error: any) {
    console.error('❌ Error al crear pago:', error);
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
  user: any,
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
        name: user.nombre || '',
        email: user.email || '',
      },
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/api/checkout-advanced/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}`,
        failure: `${process.env.NEXTAUTH_URL}/dashboard/checkout-advanced?payment=failed`,
        pending: `${process.env.NEXTAUTH_URL}/dashboard/checkout-advanced?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        userId: orderData.userId,
        visionId: orderData.visionId,
        packageType: orderData.packageType,
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
  user: any,
  productTitle: string,
  productDescription: string,
  amount: number
): Promise<string> {
  // Importar Stripe dinámicamente
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
          unit_amount: Math.round(amount * 100), // Stripe usa centavos
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: user.email,
    success_url: `${process.env.NEXTAUTH_URL}/api/checkout-advanced/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/checkout-advanced?payment=cancelled`,
    metadata: {
      userId: orderData.userId.toString(),
      visionId: orderData.visionId.toString(),
      packageType: orderData.packageType,
      organizationId: orderData.organizationId.toString(),
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
  user: any,
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
            userId: orderData.userId,
            visionId: orderData.visionId,
            packageType: orderData.packageType,
          }),
        },
      ],
      application_context: {
        brand_name: 'Frutos del Espíritu',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXTAUTH_URL}/api/checkout-advanced/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/checkout-advanced?payment=cancelled`,
      },
    }),
  });

  if (!orderRes.ok) {
    const errorData = await orderRes.json();
    console.error('Error de PayPal:', errorData);
    throw new Error('Error al crear orden en PayPal');
  }

  const orderDataRes = await orderRes.json();
  
  // Buscar el link de aprobación
  const approvalLink = orderDataRes.links?.find((link: any) => link.rel === 'approve');
  
  if (!approvalLink?.href) {
    throw new Error('PayPal no devolvió URL de aprobación');
  }

  return approvalLink.href;
}
