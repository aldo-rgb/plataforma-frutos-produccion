import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      nombreOrganizacion,
      address,
      logoUrl,
      geofencing,
      cantidadLicencias,
      paymentMethod,
      totalAmount
    } = body;

    // Validaciones
    if (!nombreOrganizacion || !cantidadLicencias || cantidadLicencias < 100) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Verificar que no exista otra organización con el mismo nombre
    const existingOrg = await prisma.organization.findFirst({
      where: {
        name: {
          equals: nombreOrganizacion.trim(),
          mode: 'insensitive' // Case insensitive
        }
      }
    });

    if (existingOrg) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una organización con ese nombre. Por favor elige otro nombre.' },
        { status: 400 }
      );
    }

    // Crear orden pendiente en la base de datos
    const order = await prisma.institutionalOrder.create({
      data: {
        userId: session.user.id,
        nombreOrganizacion,
        emailCoordinador: '', // Se dejará vacío, el director puede crear coordinadores después
        logoUrl,
        address: address?.trim() || null,
        geofencing,
        cantidadLicencias,
        totalAmount,
        paymentMethod,
        status: 'PENDING',
        updatedAt: new Date(),
      }
    });

    // Procesar según el método de pago
    let paymentUrl = '';
    let checkoutSessionId = '';

    switch (paymentMethod) {
      case 'stripe':
        // Integración con Stripe
        const stripeSession = await createStripeCheckout(order.id, totalAmount, nombreOrganizacion);
        checkoutSessionId = stripeSession.id;
        paymentUrl = stripeSession.url || '';
        break;

      case 'paypal':
        // Integración con PayPal
        paymentUrl = await createPayPalOrder(order.id, totalAmount, nombreOrganizacion);
        break;

      case 'mercadopago':
        // Integración con Mercado Pago
        paymentUrl = await createMercadoPagoPreference(order.id, totalAmount, nombreOrganizacion);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Método de pago no soportado' },
          { status: 400 }
        );
    }

    // Actualizar orden con información de pago
    await prisma.institutionalOrder.update({
      where: { id: order.id },
      data: {
        paymentSessionId: checkoutSessionId || paymentUrl,
      }
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentUrl,
      checkoutSessionId,
    });

  } catch (error) {
    logger.error('Error creating institutional order:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear la orden' },
      { status: 500 }
    );
  }
}

// Función para crear sesión de Stripe
async function createStripeCheckout(orderId: number, amount: number, organizationName: string) {
  // Obtener configuración de Stripe desde la base de datos
  const stripeConfig = await prisma.paymentGatewayConfig.findFirst({
    where: {
      provider: 'STRIPE',
      isActive: true,
    }
  });

  if (!stripeConfig || !stripeConfig.publicKey || !stripeConfig.secretKey) {
    throw new Error('Stripe no está configurado. Por favor configúralo desde el panel de administrador.');
  }

  const stripe = require('stripe')(stripeConfig.secretKey);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Plan Institucional - ${organizationName}`,
            description: 'Licenciamiento anual para centro educativo',
          },
          unit_amount: amount * 100, // Stripe usa centavos
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/contratar-institucional`,
    metadata: {
      orderId: orderId.toString(),
      type: 'institutional',
    },
  });

  return session;
}

// Función para crear orden de PayPal
async function createPayPalOrder(orderId: number, amount: number, organizationName: string) {
  // Obtener configuración de PayPal desde la base de datos
  const paypalConfig = await prisma.paymentGatewayConfig.findFirst({
    where: {
      provider: 'PAYPAL',
      isActive: true,
    }
  });

  if (!paypalConfig || !paypalConfig.publicKey || !paypalConfig.secretKey) {
    throw new Error('PayPal no está configurado. Por favor configúralo desde el panel de administrador.');
  }

  const paypal = require('@paypal/checkout-server-sdk');
  
  // Configurar cliente de PayPal
  const environment = paypalConfig.environment === 'production'
    ? new paypal.core.LiveEnvironment(paypalConfig.publicKey, paypalConfig.secretKey)
    : new paypal.core.SandboxEnvironment(paypalConfig.publicKey, paypalConfig.secretKey);
  
  const client = new paypal.core.PayPalHttpClient(environment);

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      description: `Plan Institucional - ${organizationName}`,
      amount: {
        currency_code: 'USD',
        value: amount.toString(),
      },
      custom_id: orderId.toString(),
    }],
    application_context: {
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/contratar-institucional`,
    },
  });

  const response = await client.execute(request);
  const approvalUrl = response.result.links.find((link: any) => link.rel === 'approve')?.href;
  
  return approvalUrl || '';
}

// Función para crear preferencia de Mercado Pago
async function createMercadoPagoPreference(orderId: number, amount: number, organizationName: string) {
  // Obtener configuración de Mercado Pago desde la base de datos
  const mpConfig = await prisma.paymentGatewayConfig.findFirst({
    where: {
      provider: 'MERCADOPAGO',
      isActive: true,
    }
  });

  if (!mpConfig || !mpConfig.secretKey) {
    throw new Error('Mercado Pago no está configurado. Por favor configúralo desde el panel de administrador.');
  }

  const { MercadoPagoConfig, Preference } = require('mercadopago');
  
  const client = new MercadoPagoConfig({ 
    accessToken: mpConfig.secretKey 
  });
  
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          title: `Plan Institucional - ${organizationName}`,
          description: 'Licenciamiento anual para centro educativo',
          quantity: 1,
          unit_price: amount,
          currency_id: 'MXN',
        },
      ],
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}`,
        failure: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/contratar-institucional`,
        pending: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/contratar-institucional`,
      },
      auto_return: 'approved',
      external_reference: orderId.toString(),
    }
  });
  
  return result.init_point;
}
