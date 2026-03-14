import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { checkoutCreatePaymentSchema, validateData, getValidationErrorMessage } from '@/lib/validations';

// Forzar que esta ruta sea dinámica (sin caché)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/checkout/create-payment
 * 
 * Crea una orden de pago para el REGISTRO (BÁSICO) usando la pasarela configurada por la organización
 * Soporta: MERCADOPAGO, STRIPE, PAYPAL
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting para pagos
    const { result, response } = rateLimit(request, RateLimitPresets.payment);
    if (response) {
      logger.warn('Rate limit exceeded on create-payment');
      return response;
    }

    const body = await request.json();
    
    // Validar datos con Zod
    const validation = validateData(checkoutCreatePaymentSchema, body);
    if (!validation.success) {
      const errorDetails = getValidationErrorMessage(validation.details);
      logger.debug('❌ [create-payment] Validación fallida:', { errors: errorDetails, body: JSON.stringify(body).substring(0, 500) });
      return NextResponse.json(
        { error: `Datos inválidos: ${errorDetails}`, details: errorDetails },
        { status: 400 }
      );
    }
    
    logger.debug('create-payment request', { organizationId: body.organizationId });
    
    const { 
      organizationId,
      visionId,
      amount,
      ticketSelection, // 'BASIC_ONLY' | 'FULL_VISION'
      userData, // { nombre, email, apodo, telefono }
      appliedCodes = [],
      paymentMethod, // 'STRIPE' | 'MERCADOPAGO' (opcional, si no se envía usa la primera activa)
      requiresInvoice = false,
      invoiceData,
    } = validation.data;

    // Determinar qué pasarela usar basándose en la selección del usuario
    const preferredProvider = paymentMethod?.toUpperCase() || null;
    
    // Obtener configuración de pasarela de pago de la organización
    logger.debug('🔍 [create-payment] Buscando gateway para orgId:', organizationId, 'preferredProvider:', preferredProvider);
    
    // Debug: Listar TODOS los gateways de esta organización
    const allGateways = await prisma.paymentGatewayConfig.findMany({
      where: { organizationId: organizationId },
      select: { provider: true, isActive: true, id: true }
    });
    logger.debug('🔍 [create-payment] Todos los gateways de la org:', JSON.stringify(allGateways));
    
    let gatewayConfig;
    if (preferredProvider) {
      // Buscar la pasarela específica que el usuario seleccionó
      gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
        where: { 
          organizationId: organizationId, 
          isActive: true,
          provider: preferredProvider
        },
      });
      
      logger.debug('🔍 [create-payment] Búsqueda con provider específico:', preferredProvider, '- Encontrado:', !!gatewayConfig);
      
      // Si no se encuentra la pasarela preferida, buscar cualquier activa
      if (!gatewayConfig) {
        logger.debug('⚠️ [create-payment] Pasarela preferida no encontrada, buscando alternativa');
        gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
          where: { organizationId: organizationId, isActive: true },
        });
      }
    } else {
      // Si no hay preferencia, usar la primera activa
      gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
        where: { organizationId: organizationId, isActive: true },
      });
    }

    logger.debug('🔍 [create-payment] Gateway encontrado:', gatewayConfig ? {
      provider: gatewayConfig.provider,
      isActive: gatewayConfig.isActive,
      hasSecretKey: !!gatewayConfig.secretKey,
    } : 'NO ENCONTRADO');

    if (!gatewayConfig || !gatewayConfig.isActive) {
      logger.debug('❌ [create-payment] Gateway no configurado o inactivo');
      return NextResponse.json(
        { error: 'La organización no tiene configurada una pasarela de pago. Contacta al administrador.', details: `orgId: ${organizationId}` },
        { status: 400 }
      );
    }

    if (!gatewayConfig.secretKey) {
      logger.debug('❌ [create-payment] Gateway sin credenciales');
      return NextResponse.json(
        { error: 'La pasarela de pago no tiene credenciales configuradas' },
        { status: 400 }
      );
    }

    // Obtener datos de la organización incluyendo el dominio
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, customDomain: true, slug: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Determinar la URL base para callbacks
    logger.debug('🔍 NEXTAUTH_URL env:', process.env.NEXTAUTH_URL);
    let baseUrl = process.env.NEXTAUTH_URL || 'https://impactocuantico.net';
    if (organization.customDomain) {
      baseUrl = `https://${organization.customDomain}`;
    }
    logger.debug('🌐 Base URL para callbacks:', baseUrl);

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
      // Datos de facturación
      requiresInvoice,
      invoiceData: requiresInvoice ? invoiceData : null,
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
          amount,
          baseUrl,
          organization.name
        );
        break;
      
      case 'STRIPE':
        paymentUrl = await createStripeCheckout(
          gatewayConfig.secretKey,
          orderData,
          userData,
          productTitle,
          productDescription,
          amount,
          baseUrl
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

    logger.info('Pago de registro creado', { provider: gatewayConfig.provider, ticketSelection });

    return NextResponse.json({
      success: true,
      paymentUrl,
      provider: gatewayConfig.provider,
    });

  } catch (error: any) {
    const errorMessage = error?.message || 'Error desconocido';
    const errorName = error?.name || 'Unknown';
    const errorStack = error?.stack?.substring(0, 500) || '';
    logger.error('Error al crear pago de registro', { 
      error: errorMessage, 
      name: errorName,
      stack: errorStack 
    });
    return NextResponse.json(
      {
        error: `Error al crear el pago: ${errorMessage}`,
        details: errorMessage,
        errorType: errorName,
        debugInfo: process.env.NODE_ENV === 'development' ? errorStack : undefined
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
  amount: number,
  baseUrl: string,
  organizationName: string = 'Impacto Cuantico'
): Promise<string> {
  logger.debug('🔵 MercadoPago - Creando preferencia');
  logger.debug('   Base URL:', baseUrl);
  logger.debug('   Amount:', amount);
  logger.debug('   User:', userData.email);

  const preferenceBody = {
    items: [
      {
        id: `checkout-${Date.now()}`,
        title: productTitle,
        description: productDescription,
        quantity: 1,
        currency_id: 'MXN',
        unit_price: amount,
      },
    ],
    payer: {
      name: userData.nombre || '',
      surname: '',
      email: userData.email || '',
    },
    back_urls: {
      success: `${baseUrl}/api/checkout/payment-success?provider=mercadopago`,
      failure: `${baseUrl}/checkout?payment=failed`,
      pending: `${baseUrl}/checkout?payment=pending`,
    },
    auto_return: 'approved',
    external_reference: JSON.stringify({
      type: 'REGISTRATION',
      organizationId: orderData.organizationId,
      visionId: orderData.visionId,
      ticketSelection: orderData.ticketSelection,
      amount: orderData.amount,
      userData: {
        email: userData.email,
        nombre: userData.nombre,
        apodo: userData.apodo || '',
        telefono: userData.telefono || '',
        password: userData.password || '',
        referralCode: userData.referralCode || '',
        horarioLlamada: userData.horarioLlamada || '',
        profession: userData.profession || '',
        birthdate: userData.birthdate || '',
        children: userData.children || 0,
        goals: userData.goals || [],
        expectations: (userData.expectations || '').substring(0, 200),
      },
      appliedCodes: orderData.appliedCodes || [],
    }),
    statement_descriptor: organizationName.substring(0, 22),
  };

  logger.debug('   Preference body:', JSON.stringify(preferenceBody, null, 2));

  const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferenceBody),
  });

  const responseText = await preferenceRes.text();
  logger.debug('   MercadoPago response status:', preferenceRes.status);
  logger.debug('   MercadoPago response:', responseText);

  if (!preferenceRes.ok) {
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText };
    }
    logger.error('❌ Error de Mercado Pago:', errorData);
    throw new Error(`Error de Mercado Pago: ${errorData.message || responseText}`);
  }

  const preferenceData = JSON.parse(responseText);

  // Usar init_point para producción (credenciales APP_USR-)
  // Solo usar sandbox_init_point si las credenciales empiezan con TEST-
  const isTestCredentials = accessToken.startsWith('TEST-');
  const paymentUrl = isTestCredentials 
    ? (preferenceData.sandbox_init_point || preferenceData.init_point)
    : preferenceData.init_point;

  if (!paymentUrl) {
    logger.error('❌ MercadoPago no devolvió init_point:', preferenceData);
    throw new Error('Mercado Pago no devolvió URL de pago');
  }

  logger.debug('✅ MercadoPago preferencia creada:', preferenceData.id);
  logger.debug('   Modo:', isTestCredentials ? 'TEST (sandbox)' : 'PRODUCCIÓN');
  logger.debug('   Usando:', paymentUrl);

  return paymentUrl;
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
  amount: number,
  baseUrl: string
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
    success_url: `${baseUrl}/api/checkout/payment-success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout?payment=cancelled`,
    metadata: {
      type: 'REGISTRATION',
      organizationId: orderData.organizationId.toString(),
      visionId: orderData.visionId ? orderData.visionId.toString() : '',
      ticketSelection: orderData.ticketSelection,
      // Datos del usuario para crear la cuenta después del pago
      email: userData.email,
      nombre: userData.nombre || userData.name,
      apodo: userData.apodo || '',
      telefono: userData.telefono || userData.phone || '',
      password: userData.password || '',
      referralCode: userData.referralCode || '',
      horarioLlamada: userData.horarioLlamada || '',
      profession: userData.profession || '',
      birthdate: userData.birthdate || '',
      children: userData.children?.toString() || '0',
      goals: userData.goals ? JSON.stringify(userData.goals) : '[]',
      expectations: (userData.expectations || '').substring(0, 450),
      appliedCodes: JSON.stringify(orderData.appliedCodes || []),
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
    logger.error('Error de PayPal:', errorData);
    throw new Error('Error al crear orden en PayPal');
  }

  const orderDataRes = await orderRes.json();
  
  const approvalLink = orderDataRes.links?.find((link: any) => link.rel === 'approve');
  
  if (!approvalLink?.href) {
    throw new Error('PayPal no devolvió URL de aprobación');
  }

  return approvalLink.href;
}
