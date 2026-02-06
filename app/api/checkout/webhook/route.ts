import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type Stripe from 'stripe';

// Stripe se inicializa solo si hay API key
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/checkout/webhook
 * Webhook de Stripe para procesar pagos completados
 * NOTA: Actualmente deshabilitado - usar códigos de regalo
 */
export async function POST(request: Request) {
  try {
    // Stripe deshabilitado temporalmente
    if (!stripe) {
      return NextResponse.json(
        { error: 'Webhook no configurado' },
        { status: 503 }
      );
    }

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
    } catch (err) {
      logger.warn('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Webhook signature failed' },
        { status: 400 }
      );
    }

    // Manejar eventos
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extraer metadata
      const metadata = session.metadata;
      if (!metadata) {
        logger.warn('No metadata in Stripe session');
        return NextResponse.json({ received: true });
      }

      const { userId, visionId, level, type, paymentMethod } = metadata;

      // Buscar usuario
      const user = await prisma.usuario.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        logger.warn('User not found in webhook', { userId });
        return NextResponse.json({ received: true });
      }

      // Buscar visión
      const vision = await prisma.vision.findUnique({
        where: { id: parseInt(visionId) },
      });

      if (!vision) {
        logger.warn('Vision not found in webhook', { visionId });
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

      logger.info('Ticket created from Stripe webhook', { ticketId: ticket.id });

      // TODO: Enviar email de confirmación al usuario
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
