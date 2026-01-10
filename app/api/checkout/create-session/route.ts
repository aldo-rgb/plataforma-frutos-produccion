import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Stripe se inicializa solo si hay API key
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

/**
 * POST /api/checkout/create-session
 * Crea una sesión de checkout de Stripe
 * NOTA: Actualmente deshabilitado - usar códigos de regalo en su lugar
 */
export async function POST(request: Request) {
  try {
    // Stripe deshabilitado temporalmente
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Pasarela de pago no configurada. Por favor usa un código de regalo.' },
        { status: 503 }
      );
    }

    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        nombre: true,
        email: true,
        organizationId: true 
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      visionId,
      level,
      type,
      paymentMethod,
      provider = 'stripe'
    } = body;

    // Validar datos
    if (!visionId || !level || !type) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Buscar visión
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: { 
        id: true,
        nombre: true,
        startDate: true,
        organizationId: true 
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Obtener configuración de precios
    const priceConfig = await prisma.ticketPriceConfig.findUnique({
      where: {
        organizationId_level: {
          organizationId: vision.organizationId,
          level: level,
        },
      },
    });

    if (!priceConfig) {
      return NextResponse.json(
        { success: false, error: 'Configuración de precios no encontrada' },
        { status: 404 }
      );
    }

    // Calcular precio
    let amount = 0;
    if (type === 'PROMO_50' && priceConfig.promoPrice) {
      amount = paymentMethod === 'partial' && priceConfig.partialPayment
        ? Number(priceConfig.partialPayment)
        : Number(priceConfig.promoPrice);
    } else if (type === 'COMBO_PARTIAL' && priceConfig.comboAdvPL) {
      amount = Number(priceConfig.comboAdvPL);
    } else {
      amount = paymentMethod === 'partial' && priceConfig.partialPayment
        ? Number(priceConfig.partialPayment)
        : Number(priceConfig.regularPrice);
    }

    if (provider === 'stripe') {
      // Crear sesión de Stripe
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: `Ticket ${level} - ${vision.nombre}`,
                description: `Acceso a ${vision.nombre}`,
              },
              unit_amount: Math.round(amount * 100), // Convertir a centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/checkout/tickets?visionId=${visionId}`,
        metadata: {
          userId: user.id.toString(),
          visionId: vision.id.toString(),
          level,
          type,
          paymentMethod: paymentMethod || 'full',
        },
      });

      return NextResponse.json({
        success: true,
        sessionId: stripeSession.id,
        url: stripeSession.url,
        provider: 'stripe',
      });
    } else if (provider === 'mercadopago') {
      // TODO: Implementar MercadoPago
      return NextResponse.json({
        success: false,
        error: 'MercadoPago aún no implementado',
      }, { status: 501 });
    }

    return NextResponse.json({
      success: false,
      error: 'Proveedor de pago no válido',
    }, { status: 400 });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}
