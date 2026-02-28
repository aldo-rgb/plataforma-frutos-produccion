import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Forzar que esta ruta sea dinámica (sin caché)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper para obtener la URL base
function getBaseUrl(): string {
  // URL de producción hardcodeada para evitar problemas
  const PRODUCTION_URL = 'https://www.impactocuantico.net';
  
  // En producción, siempre usar la URL de producción
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_URL;
  }
  
  // En desarrollo, usar NEXTAUTH_URL si está configurada
  if (process.env.NEXTAUTH_URL) {
    // Asegurarse de que no tenga trailing slash
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  
  // Fallback para desarrollo
  return 'http://localhost:3000';
}

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
    
    // DEBUG: Log received data
    logger.debug('📥 create-payment received:', {
      visionId,
      organizationId,
      packageType,
      amount,
      pendingDebt,
      appliedCodesCount: appliedCodes?.length,
    });

    if (!visionId || !organizationId || !packageType || !amount) {
      logger.error('❌ Datos incompletos:', { visionId, organizationId, packageType, amount });
      return NextResponse.json(
        { success: false, error: 'Datos incompletos', details: `visionId=${visionId}, organizationId=${organizationId}, packageType=${packageType}, amount=${amount}` },
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
    const gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { organizationId: organizationId, isActive: true },
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
      case 'PL_APARTADO':
        productTitle = 'Apartado Tu VIDA (PL)';
        productDescription = 'Apartado $1,500 para Combo Tu VIDA - Frutos del Espíritu';
        break;
      case 'PL_COMPLETO':
        productTitle = 'Combo Completo Tu VIDA (PL)';
        productDescription = 'Completar Combo Avanzado + Tu VIDA - Frutos del Espíritu';
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

    logger.debug(`✅ Pago creado para usuario ${userId}`);
    logger.debug(`   Pasarela: ${gatewayConfig.provider}`);
    logger.debug(`   Paquete: ${packageType}`);
    logger.debug(`   Monto: $${amount} MXN`);

    return NextResponse.json({
      success: true,
      paymentUrl,
      provider: gatewayConfig.provider,
    });

  } catch (error: any) {
    logger.error('❌ Error al crear pago:', error);
    logger.error('❌ Error message:', error.message);
    logger.error('❌ Error stack:', error.stack);
    logger.error('❌ Error name:', error.name);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear el pago',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
  const baseUrl = getBaseUrl();
  logger.debug(`📍 Base URL para back_urls: ${baseUrl}`);
  
  // Crear un ID único para esta transacción
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Guardar los datos de la orden en external_reference
  // IMPORTANTE: Incluir todos los datos necesarios para crear enrollments/tickets
  const externalReference = JSON.stringify({
    transactionId,
    userId: orderData.userId,
    visionId: orderData.visionId,
    organizationId: orderData.organizationId,
    packageType: orderData.packageType,
    amount: orderData.amount,
    pendingDebt: orderData.pendingDebt || 0,
    prices: orderData.prices,
  });
  
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
        success: `${baseUrl}/api/checkout-advanced/payment-success`,
        failure: `${baseUrl}/dashboard/checkout-advanced?payment=failed`,
        pending: `${baseUrl}/dashboard/checkout-advanced?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      metadata: orderData,
    }),
  });

  if (!preferenceRes.ok) {
    const errorData = await preferenceRes.json();
    logger.error('Error de Mercado Pago:', JSON.stringify(errorData, null, 2));
    logger.error('MP Status:', preferenceRes.status);
    throw new Error(`Error de Mercado Pago: ${JSON.stringify(errorData)}`);
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
  const baseUrl = getBaseUrl();
  
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
    success_url: `${baseUrl}/api/checkout-advanced/payment-success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/checkout-advanced?payment=cancelled`,
    metadata: {
      userId: orderData.userId.toString(),
      visionId: orderData.visionId.toString(),
      packageType: orderData.packageType,
      organizationId: orderData.organizationId.toString(),
      amount: orderData.amount.toString(),
      pendingDebt: (orderData.pendingDebt || 0).toString(),
      orderDataJson: JSON.stringify(orderData),
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
    logger.error('Error de PayPal:', errorData);
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
