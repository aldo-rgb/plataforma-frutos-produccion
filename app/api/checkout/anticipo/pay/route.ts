import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import logger from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST - Crear sesión de pago para anticipo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { checkoutId, ticketId, amount, provider } = body;

    if (!checkoutId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener el checkout con sus relaciones
    const checkout = await prisma.abandonedCheckout.findUnique({
      where: { id: checkoutId },
      include: {
        vision: true,
        organization: true,
        user: true,
      },
    });

    if (!checkout) {
      return NextResponse.json(
        { success: false, error: 'Checkout no encontrado' },
        { status: 404 }
      );
    }

    const visionName = checkout.vision?.nombre || 'Programa';
    const orgName = checkout.organization.name;

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/checkout/success?type=anticipo&checkoutId=${checkoutId}`;
    const cancelUrl = `${baseUrl}/checkout/anticipo?id=${checkoutId}`;

    if (provider === 'stripe') {
      // Crear sesión de Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: `Anticipo - ${visionName}`,
                description: `Anticipo para reservar lugar en ${visionName}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl + '&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl,
        customer_email: checkout.email,
        metadata: {
          checkoutId,
          ticketId: ticketId?.toString() || '',
          type: 'anticipo',
          userId: checkout.userId?.toString() || '',
          visionId: checkout.visionId?.toString() || '',
          organizationId: checkout.organizationId.toString(),
        },
      });

      return NextResponse.json({
        success: true,
        paymentUrl: session.url,
        sessionId: session.id,
      });
    } else if (provider === 'mercadopago') {
      // Usar token de la organización o el default
      const mpToken = (checkout.organization as any).mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      
      if (!mpToken) {
        return NextResponse.json(
          { success: false, error: 'MercadoPago no configurado' },
          { status: 400 }
        );
      }

      const client = new MercadoPagoConfig({ accessToken: mpToken });
      const preference = new Preference(client);

      const preferenceData = await preference.create({
        body: {
          items: [
            {
              id: `anticipo-${checkoutId}`,
              title: `Anticipo - ${visionName}`,
              description: `Anticipo para reservar lugar en ${visionName} - ${orgName}`,
              quantity: 1,
              unit_price: amount,
              currency_id: 'MXN',
            },
          ],
          payer: {
            email: checkout.email,
            name: checkout.firstName || undefined,
            surname: checkout.lastName || undefined,
          },
          back_urls: {
            success: successUrl,
            failure: cancelUrl,
            pending: `${baseUrl}/checkout/pending?checkoutId=${checkoutId}`,
          },
          auto_return: 'approved',
          external_reference: JSON.stringify({
            checkoutId,
            ticketId: ticketId || null,
            type: 'anticipo',
            userId: checkout.userId,
            visionId: checkout.visionId,
            organizationId: checkout.organizationId,
          }),
          notification_url: `${baseUrl}/api/webhooks/mercadopago`,
          statement_descriptor: orgName.substring(0, 22),
        },
      });

      // Usar init_point para producción, solo sandbox_init_point si es TEST
      const isTestCredentials = mpToken.startsWith('TEST-');
      const paymentUrl = isTestCredentials 
        ? (preferenceData.sandbox_init_point || preferenceData.init_point)
        : preferenceData.init_point;

      return NextResponse.json({
        success: true,
        paymentUrl: paymentUrl,
        preferenceId: preferenceData.id,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Proveedor de pago no válido' },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error('Error creating anticipo payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear el pago' },
      { status: 500 }
    );
  }
}
