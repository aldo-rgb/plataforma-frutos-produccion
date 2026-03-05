import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Forzar que esta ruta sea dinámica (sin caché)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/tickets/create-payment
 * 
 * Crea una orden de pago para un ticket pendiente usando la pasarela de la organización
 * Soporta: MERCADOPAGO, STRIPE, PAYPAL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    logger.info(`[CreatePayment] Session: ${JSON.stringify({ userId: session?.user?.id, email: session?.user?.email })}`);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    
    const { ticketId, amount } = body;
    
    logger.info(`[CreatePayment] Request: ticketId=${ticketId}, amount=${amount}, userId=${userId}`);

    if (!ticketId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener ticket con organización
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
      },
    });

    if (!ticket) {
      logger.warn(`[CreatePayment] Ticket not found: ${ticketId}`);
      return NextResponse.json({ success: false, error: 'Ticket no encontrado' }, { status: 404 });
    }

    logger.info(`[CreatePayment] Ticket found: ownerId=${ticket.ownerId}, status=${ticket.status}, paymentStatus=${ticket.paymentStatus}, orgId=${ticket.organizationId}`);

    // Verificar propiedad
    if (ticket.ownerId !== userId) {
      logger.warn(`[CreatePayment] Access denied: ticket.ownerId=${ticket.ownerId}, userId=${userId}`);
      return NextResponse.json({ success: false, error: 'No tienes acceso a este ticket' }, { status: 403 });
    }

    // Verificar que el ticket tenga pago pendiente
    if (ticket.status !== 'PENDING_PAYMENT' && ticket.paymentStatus !== 'PENDING' && ticket.paymentStatus !== 'PARTIAL') {
      logger.warn(`[CreatePayment] No pending payment: status=${ticket.status}, paymentStatus=${ticket.paymentStatus}`);
      return NextResponse.json(
        { success: false, error: 'Este ticket no tiene pagos pendientes' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, email: true },
    });

    if (!user) {
      logger.warn(`[CreatePayment] User not found: ${userId}`);
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener configuración de pasarela de la organización
    const gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { organizationId: ticket.organizationId, isActive: true },
    });

    logger.info(`[CreatePayment] Gateway config: ${JSON.stringify({ found: !!gatewayConfig, provider: gatewayConfig?.provider, hasSecretKey: !!gatewayConfig?.secretKey })}`);

    if (!gatewayConfig || !gatewayConfig.isActive) {
      logger.error(`[CreatePayment] No gateway config for org ${ticket.organizationId}`);
      return NextResponse.json(
        { success: false, error: 'La organización no tiene configurada una pasarela de pago' },
        { status: 400 }
      );
    }

    if (!gatewayConfig.secretKey) {
      logger.error(`[CreatePayment] Gateway has no secretKey for org ${ticket.organizationId}`);
      return NextResponse.json(
        { success: false, error: 'La pasarela de pago no tiene credenciales configuradas' },
        { status: 400 }
      );
    }

    // Generar título del producto
    const levelLabels: Record<string, string> = {
      'BASIC': 'Básico',
      'ADVANCED': 'Avanzado',
      'PL': 'Participación Libre (PL)',
    };
    
    const productTitle = `Pago de Ticket - ${levelLabels[ticket.level] || ticket.level}`;
    const productDescription = `Pago pendiente de ${levelLabels[ticket.level]} - ${ticket.organization.name}`;

    const orderData = {
      ticketId,
      userId,
      organizationId: ticket.organizationId,
      visionId: ticket.visionId,
      level: ticket.level,
      amount,
      productTitle,
      productDescription,
      type: 'TICKET_PAYMENT',
    };

    let paymentUrl = '';

    // Crear pago según la pasarela configurada
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

    logger.debug(`✅ Pago de ticket creado`);
    logger.debug(`   Pasarela: ${gatewayConfig.provider}`);
    logger.debug(`   Ticket: ${ticketId}`);
    logger.debug(`   Monto: $${amount} MXN`);

    return NextResponse.json({
      success: true,
      paymentUrl,
      provider: gatewayConfig.provider,
    });

  } catch (error: any) {
    logger.error('❌ Error al crear pago de ticket:', error);
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
        success: `${process.env.NEXTAUTH_URL}/api/tickets/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}`,
        failure: `${process.env.NEXTAUTH_URL}/dashboard/checkout-ticket?ticketId=${orderData.ticketId}&payment=failed`,
        pending: `${process.env.NEXTAUTH_URL}/dashboard/checkout-ticket?ticketId=${orderData.ticketId}&payment=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        type: 'TICKET_PAYMENT',
        ticketId: orderData.ticketId,
        userId: orderData.userId,
      }),
      metadata: orderData,
    }),
  });

  if (!preferenceRes.ok) {
    const errorData = await preferenceRes.json();
    logger.error('Error de Mercado Pago:', errorData);
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
    customer_email: user.email,
    success_url: `${process.env.NEXTAUTH_URL}/api/tickets/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/checkout-ticket?ticketId=${orderData.ticketId}&payment=cancelled`,
    metadata: {
      type: 'TICKET_PAYMENT',
      ticketId: orderData.ticketId,
      userId: orderData.userId.toString(),
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
            type: 'TICKET_PAYMENT',
            ticketId: orderData.ticketId,
            userId: orderData.userId,
          }),
        },
      ],
      application_context: {
        brand_name: 'Frutos del Espíritu',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXTAUTH_URL}/api/tickets/payment-success?data=${encodeURIComponent(JSON.stringify(orderData))}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/checkout-ticket?ticketId=${orderData.ticketId}&payment=cancelled`,
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
