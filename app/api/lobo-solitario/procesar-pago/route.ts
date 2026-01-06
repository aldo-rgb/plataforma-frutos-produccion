import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/lobo-solitario/procesar-pago
 * Genera URL de pago para orden de lobo solitario
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ordenId, metodoPago } = body;

    if (!ordenId || !metodoPago) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener la orden
    const orden = await prisma.mentorPackageOrder.findUnique({
      where: { id: ordenId },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true,
          },
        },
        Mentor: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que pertenece al usuario
    if (orden.usuarioId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para procesar esta orden' },
        { status: 403 }
      );
    }

    if (orden.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'La orden ya fue procesada' },
        { status: 400 }
      );
    }

    let approvalUrl = '';

    // Generar URL según método de pago
    switch (metodoPago.toUpperCase()) {
      case 'PAYPAL':
        approvalUrl = await createPayPalOrder(ordenId, orden.precioTotal, orden.cantidad);
        break;
      case 'STRIPE':
        approvalUrl = await createStripeCheckout(ordenId, orden.precioTotal, orden.cantidad);
        break;
      case 'MERCADOPAGO':
        approvalUrl = await createMercadoPagoPreference(ordenId, orden.precioTotal, orden.cantidad);
        break;
      default:
        return NextResponse.json(
          { error: 'Método de pago no válido' },
          { status: 400 }
        );
    }

    // Actualizar orden con método de pago
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: {
        metodoPago: metodoPago.toUpperCase(),
      },
    });

    console.log(`✅ URL de pago generada para lobo solitario: ${ordenId}`);
    console.log(`   Método: ${metodoPago}`);
    console.log(`   Monto: $${orden.precioTotal} MXN`);

    return NextResponse.json({
      success: true,
      approvalUrl,
      ordenId,
    });
  } catch (error: any) {
    console.error('Error al procesar pago lobo solitario:', error);
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
// INTEGRACIÓN CON PAYPAL
// ============================================================================
async function createPayPalOrder(
  ordenId: string,
  amount: number,
  cantidadSesiones: number
): Promise<string> {
  try {
    // Obtener configuración de PayPal desde la base de datos
    const paypalConfig = await prisma.paymentGateway.findFirst({
      where: {
        provider: 'PAYPAL',
        isActive: true,
      }
    });

    if (!paypalConfig || !paypalConfig.publicKey || !paypalConfig.secretKey) {
      throw new Error('PayPal no está configurado. Por favor configúralo desde el panel de administrador.');
    }

    const PAYPAL_CLIENT_ID = paypalConfig.publicKey;
    const PAYPAL_SECRET = paypalConfig.secretKey;
    const PAYPAL_API_URL =
      paypalConfig.environment === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

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

    if (!tokenRes.ok) {
      throw new Error('Error al obtener token de PayPal');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Convertir MXN a USD (aproximado, usar tipo de cambio actualizado)
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
            description: `Paquete de ${cantidadSesiones} Sesiones de Mentoría - Lobo Solitario`,
          },
        ],
        application_context: {
          return_url: `${process.env.NEXTAUTH_URL}/api/lobo-solitario/payment-success?ordenId=${ordenId}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion?payment=cancelled`,
        },
      }),
    });

    if (!orderRes.ok) {
      throw new Error('Error al crear orden en PayPal');
    }

    const orderData = await orderRes.json();

    if (!orderData.id) {
      throw new Error('PayPal no devolvió ID de orden');
    }

    // Guardar externalPaymentId
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: { externalPaymentId: orderData.id },
    });

    // Retornar URL de aprobación
    const approveLink = orderData.links.find((link: any) => link.rel === 'approve');
    return approveLink?.href || '';
  } catch (error: any) {
    console.error('Error PayPal:', error);
    throw error;
  }
}

// ============================================================================
// INTEGRACIÓN CON STRIPE
// ============================================================================
async function createStripeCheckout(
  ordenId: string,
  amount: number,
  cantidadSesiones: number
): Promise<string> {
  try {
    // Obtener configuración de Stripe desde la base de datos
    const stripeConfig = await prisma.paymentGateway.findFirst({
      where: {
        provider: 'STRIPE',
        isActive: true,
      }
    });

    if (!stripeConfig || !stripeConfig.secretKey) {
      throw new Error('Stripe no está configurado. Por favor configúralo desde el panel de administrador.');
    }

    const stripe = require('stripe')(stripeConfig.secretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Paquete de ${cantidadSesiones} Sesiones de Mentoría`,
              description: 'Lobo Solitario - Frutos del Espíritu',
            },
            unit_amount: amount * 100, // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/api/lobo-solitario/payment-success?ordenId=${ordenId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion?payment=cancelled`,
      metadata: {
        ordenId: ordenId,
        tipoCliente: 'LOBO_SOLITARIO',
      },
    });

    // Guardar externalPaymentId
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: { externalPaymentId: session.id },
    });

    return session.url || '';
  } catch (error: any) {
    console.error('Error Stripe:', error);
    throw error;
  }
}

// ============================================================================
// INTEGRACIÓN CON MERCADO PAGO
// ============================================================================
async function createMercadoPagoPreference(
  ordenId: string,
  amount: number,
  cantidadSesiones: number
): Promise<string> {
  try {
    // Obtener configuración de Mercado Pago desde la base de datos
    const mpConfig = await prisma.paymentGateway.findFirst({
      where: {
        provider: 'MERCADOPAGO',
        isActive: true,
      }
    });

    if (!mpConfig || !mpConfig.secretKey) {
      throw new Error('Mercado Pago no está configurado. Por favor configúralo desde el panel de administrador.');
    }

    const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpConfig.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: `Paquete de ${cantidadSesiones} Sesiones de Mentoría - Lobo Solitario`,
            description: 'Frutos del Espíritu',
            quantity: 1,
            currency_id: 'MXN',
            unit_price: amount,
          },
        ],
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/api/lobo-solitario/payment-success?ordenId=${ordenId}`,
          failure: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion?payment=failed`,
          pending: `${process.env.NEXTAUTH_URL}/dashboard/suscripcion?payment=pending`,
        },
        auto_return: 'approved',
        external_reference: ordenId,
      }),
    });

    if (!preferenceRes.ok) {
      throw new Error('Error al crear preferencia en Mercado Pago');
    }

    const preferenceData = await preferenceRes.json();

    if (!preferenceData.id) {
      throw new Error('Mercado Pago no devolvió ID de preferencia');
    }

    // Guardar externalPaymentId
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: { externalPaymentId: preferenceData.id },
    });

    return preferenceData.init_point;
  } catch (error: any) {
    console.error('Error en MercadoPago:', error);
    throw error;
  }
}
