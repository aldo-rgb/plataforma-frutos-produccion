import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getPaymentGateway } from '@/lib/payment-gateway';

/**
 * POST /api/checkout/create-session
 * Crea una sesión de checkout de Stripe o MercadoPago
 */
export async function POST(request: Request) {
  try {
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

    if (!vision.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Visión sin organización asignada' },
        { status: 400 }
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

    // Obtener pasarela de pago para la organización
    const gateway = await getPaymentGateway(
      vision.organizationId, 
      provider as 'stripe' | 'mercadopago' | 'paypal'
    );

    if (!gateway) {
      return NextResponse.json(
        { success: false, error: 'No hay pasarela de pago configurada. Por favor contacta al administrador.' },
        { status: 503 }
      );
    }

    if (provider === 'stripe') {
      if (gateway.provider !== 'stripe') {
        return NextResponse.json(
          { success: false, error: `Esta organización usa ${gateway.provider.toUpperCase()}, no Stripe` },
          { status: 400 }
        );
      }

      const Stripe = require('stripe');
      const stripe = new Stripe(gateway.secretKey, { apiVersion: '2023-10-16' });

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
      if (gateway.provider !== 'mercadopago') {
        return NextResponse.json(
          { success: false, error: `Esta organización usa ${gateway.provider.toUpperCase()}, no MercadoPago` },
          { status: 400 }
        );
      }

      const { MercadoPagoConfig, Preference } = require('mercadopago');
      const client = new MercadoPagoConfig({ accessToken: gateway.secretKey });
      const preference = new Preference(client);

      const preferenceData = await preference.create({
        body: {
          items: [
            {
              id: `ticket-${vision.id}-${level}`,
              title: `Ticket ${level} - ${vision.nombre}`,
              description: `Acceso a ${vision.nombre}`,
              quantity: 1,
              unit_price: amount,
              currency_id: 'MXN',
            },
          ],
          payer: {
            email: user.email,
            name: user.nombre,
          },
          back_urls: {
            success: `${process.env.NEXTAUTH_URL}/checkout/success`,
            failure: `${process.env.NEXTAUTH_URL}/checkout/tickets?visionId=${visionId}`,
            pending: `${process.env.NEXTAUTH_URL}/checkout/pending`,
          },
          auto_return: 'approved',
          metadata: {
            userId: user.id.toString(),
            visionId: vision.id.toString(),
            level,
            type,
            paymentMethod: paymentMethod || 'full',
          },
        },
      });

      const isTest = gateway.secretKey.startsWith('TEST-');
      const paymentUrl = isTest 
        ? (preferenceData.sandbox_init_point || preferenceData.init_point)
        : preferenceData.init_point;

      return NextResponse.json({
        success: true,
        preferenceId: preferenceData.id,
        url: paymentUrl,
        provider: 'mercadopago',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Proveedor de pago no válido',
    }, { status: 400 });

  } catch (error) {
    logger.error('Error creating checkout session:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}
