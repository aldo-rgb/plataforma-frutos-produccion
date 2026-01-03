import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        geofencing,
        cantidadLicencias,
        totalAmount,
        paymentMethod,
        status: 'PENDING',
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
    console.error('Error creating institutional order:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear la orden' },
      { status: 500 }
    );
  }
}

// Función para crear sesión de Stripe (SIMULADO)
async function createStripeCheckout(orderId: number, amount: number, organizationName: string) {
  // MODO SIMULACIÓN - Comentar/descomentar según necesites
  const SIMULATION_MODE = true;

  if (SIMULATION_MODE) {
    // Simulación: Retornar URL de éxito directamente
    return {
      id: `sim_stripe_${orderId}_${Date.now()}`,
      url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}&payment_method=stripe&simulated=true`,
    };
  }

  /* Código real de Stripe (requiere instalación: npm install stripe)
  
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/contratar-institucional`,
    metadata: {
      orderId: orderId.toString(),
      type: 'institutional',
    },
  });

  return session;
  */
  
  throw new Error('Stripe no está configurado. Activa SIMULATION_MODE o instala las dependencias.');
}

// Función para crear orden de PayPal (SIMULADO)
async function createPayPalOrder(orderId: number, amount: number, organizationName: string) {
  // MODO SIMULACIÓN - Comentar/descomentar según necesites
  const SIMULATION_MODE = true;

  if (SIMULATION_MODE) {
    // Simulación: Retornar URL de éxito directamente
    const simulatedPayPalUrl = `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}&payment_method=paypal&simulated=true`;
    return simulatedPayPalUrl;
  }

  /* Código real de PayPal (requiere instalación: npm install @paypal/checkout-server-sdk)
  
  const paypal = require('@paypal/checkout-server-sdk');
  
  // Configurar cliente de PayPal
  const environment = process.env.PAYPAL_MODE === 'production'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  
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
  */
  
  throw new Error('PayPal no está configurado. Activa SIMULATION_MODE o instala las dependencias.');
}

// Función para crear preferencia de Mercado Pago (SIMULADO)
async function createMercadoPagoPreference(orderId: number, amount: number, organizationName: string) {
  // MODO SIMULACIÓN - Comentar/descomentar según necesites
  const SIMULATION_MODE = true;

  if (SIMULATION_MODE) {
    // Simulación: Retornar URL de éxito directamente
    const simulatedMPUrl = `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}&payment_method=mercadopago&simulated=true`;
    return simulatedMPUrl;
  }

  /* Código real de Mercado Pago (requiere instalación: npm install mercadopago)
  
  const mercadopago = require('mercadopago');
  
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
  });

  const preference = {
    items: [
      {
        title: `Plan Institucional - ${organizationName}`,
        description: 'Licenciamiento anual para centro educativo',
        quantity: 1,
        unit_price: amount,
        currency_id: 'USD',
      },
    ],
    back_urls: {
      success: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/success?order_id=${orderId}`,
      failure: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/contratar-institucional`,
      pending: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion/contratar-institucional`,
    },
    auto_return: 'approved',
    external_reference: orderId.toString(),
  };

  const response = await mercadopago.preferences.create(preference);
  return response.body.init_point;
  */
  
  throw new Error('Mercado Pago no está configurado. Activa SIMULATION_MODE o instala las dependencias.');
}
