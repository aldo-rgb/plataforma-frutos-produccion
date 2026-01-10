import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type Stripe from 'stripe';

// Stripe se inicializa solo si hay API key
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia'
  });
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/mentor/application/webhook
 * Webhook de Stripe para confirmar pagos de solicitudes de mentor
 * NOTA: Actualmente deshabilitado - usar códigos de regalo
 */
export async function POST(req: Request) {
  try {
    // Stripe deshabilitado temporalmente
    if (!stripe) {
      return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Manejar el evento de pago exitoso
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const applicationId = session.metadata?.applicationId;
      const userId = session.metadata?.userId;

      if (!applicationId || !userId) {
        console.error('Missing metadata in checkout session');
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Actualizar la solicitud a PENDING
      await prisma.mentorApplication.update({
        where: { id: parseInt(applicationId) },
        data: {
          status: 'PENDING',
          paymentStatus: 'PAID',
          amountPaid: (session.amount_total || 0) / 100, // Convertir de centavos a pesos
          paymentIntentId: session.payment_intent as string,
          updatedAt: new Date()
        }
      });

      // Crear notificación para administradores
      const admins = await prisma.usuario.findMany({
        where: {
          rol: {
            in: ['ADMIN', 'DIRECTOR']
          }
        },
        select: { id: true }
      });

      // Notificar a cada admin (podrías usar un sistema de notificaciones)
      console.log(`✅ Nueva solicitud de mentor pagada: Application ID ${applicationId}`);
      console.log(`📧 Notificar a ${admins.length} administradores`);

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 500 }
    );
  }
}
