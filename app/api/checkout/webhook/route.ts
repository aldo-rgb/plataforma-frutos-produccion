import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/checkout/webhook
 * Webhook de Stripe para procesar pagos completados
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Manejar eventos
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extraer metadata
      const metadata = session.metadata;
      if (!metadata) {
        console.error('No metadata in session');
        return NextResponse.json({ received: true });
      }

      const { userId, visionId, level, type, paymentMethod } = metadata;

      // Buscar usuario
      const user = await prisma.usuario.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        console.error('User not found:', userId);
        return NextResponse.json({ received: true });
      }

      // Buscar visión
      const vision = await prisma.vision.findUnique({
        where: { id: parseInt(visionId) },
      });

      if (!vision) {
        console.error('Vision not found:', visionId);
        return NextResponse.json({ received: true });
      }

      // Obtener precio pagado
      const amountPaid = session.amount_total ? session.amount_total / 100 : 0;

      // Determinar estado del pago
      const isPaidFull = paymentMethod !== 'partial';
      const ticketStatus = isPaidFull ? 'ACTIVE' : 'PENDING_PAYMENT';
      const paymentStatus = isPaidFull ? 'PAID' : 'PARTIAL';

      // Calcular validUntil
      const visionStart = vision.startDate || new Date();
      const validUntil = new Date(visionStart.getTime() + 24 * 60 * 60 * 1000);

      // Crear ticket
      const ticket = await prisma.ticket.create({
        data: {
          ownerId: user.id,
          organizationId: vision.organizationId || user.organizationId || 1,
          visionId: vision.id,
          level: level as any,
          type: type as any,
          status: ticketStatus as any,
          isTransferable: true,
          validUntil,
          paymentStatus: paymentStatus as any,
          purchasePrice: amountPaid,
        },
      });

      console.log('Ticket created:', ticket.id);

      // TODO: Enviar email de confirmación al usuario
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
