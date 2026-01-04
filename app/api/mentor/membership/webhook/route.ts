import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_MEMBERSHIP || '';

/**
 * POST /api/mentor/membership/webhook
 * Webhook de Stripe para procesar eventos de membresías:
 * - invoice.payment_succeeded: Renovación exitosa
 * - invoice.payment_failed: Fallo en renovación
 * - customer.subscription.deleted: Cancelación de suscripción
 * - checkout.session.completed: Primera renovación manual
 */
export async function POST(req: Request) {
  try {
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

    console.log('📥 Webhook event received:', event.type);

    // Renovación manual completada (checkout.session.completed)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const mentorId = session.metadata?.mentorId;
      const renewalType = session.metadata?.renewalType; // "manual" or "subscription"

      if (!mentorId) {
        console.error('Missing mentorId in metadata');
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Buscar el perfil de mentor
      const mentor = await prisma.perfilMentor.findUnique({
        where: { id: parseInt(mentorId) },
        include: { usuario: true }
      });

      if (!mentor) {
        console.error('Mentor not found:', mentorId);
        return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
      }

      // Calcular nueva fecha de expiración (+1 año)
      const newExpiryDate = new Date();
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

      // Actualizar membresía
      await prisma.$transaction(async (tx) => {
        // Actualizar perfil de mentor
        await tx.perfilMentor.update({
          where: { id: mentor.id },
          data: {
            membershipActive: true,
            membershipStartDate: new Date(),
            membershipExpiryDate: newExpiryDate,
            disponible: true,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: renewalType === 'subscription' ? (session.subscription as string) : mentor.stripeSubscriptionId
          }
        });

        // Crear registro de renovación
        await tx.mentorMembershipRenewal.create({
          data: {
            mentorId: mentor.id,
            previousExpiryDate: mentor.membershipExpiryDate || new Date(),
            newExpiryDate: newExpiryDate,
            amountPaid: (session.amount_total || 0) / 100,
            paymentIntentId: session.payment_intent as string,
            renewalType: renewalType === 'subscription' ? 'AUTO' : 'MANUAL',
            status: 'COMPLETED'
          }
        });

        // Crear notificación para el mentor
        await tx.notificacion.create({
          data: {
            usuarioId: mentor.usuarioId,
            titulo: '✅ Membresía Renovada',
            mensaje: `Tu membresía ha sido renovada exitosamente. Nueva fecha de expiración: ${newExpiryDate.toLocaleDateString('es-MX')}`,
            tipo: 'SYSTEM',
            leida: false
          }
        });
      });

      console.log(`✅ Membresía renovada para mentor ${mentorId} hasta ${newExpiryDate.toISOString()}`);

      // TODO: Enviar email de confirmación
      // await sendEmail({
      //   to: mentor.usuario.email,
      //   subject: 'Membresía Renovada - Plataforma Frutos',
      //   template: 'membership-renewed',
      //   data: { name: mentor.usuario.nombre, expiryDate: newExpiryDate }
      // });

      return NextResponse.json({ received: true, status: 'renewed' });
    }

    // Pago de factura exitoso (invoice.payment_succeeded)
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Solo procesar facturas de suscripción (no la primera factura del checkout)
      if (invoice.billing_reason !== 'subscription_cycle') {
        return NextResponse.json({ received: true, status: 'skipped' });
      }

      const subscriptionId = invoice.subscription as string;

      // Buscar mentor por subscriptionId
      const mentor = await prisma.perfilMentor.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        include: { usuario: true }
      });

      if (!mentor) {
        console.error('Mentor not found for subscription:', subscriptionId);
        return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
      }

      // Calcular nueva fecha de expiración
      const newExpiryDate = new Date();
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

      // Renovar membresía
      await prisma.$transaction(async (tx) => {
        await tx.perfilMentor.update({
          where: { id: mentor.id },
          data: {
            membershipActive: true,
            membershipStartDate: new Date(),
            membershipExpiryDate: newExpiryDate,
            disponible: true
          }
        });

        await tx.mentorMembershipRenewal.create({
          data: {
            mentorId: mentor.id,
            previousExpiryDate: mentor.membershipExpiryDate || new Date(),
            newExpiryDate: newExpiryDate,
            amountPaid: (invoice.amount_paid || 0) / 100,
            paymentIntentId: invoice.payment_intent as string,
            renewalType: 'AUTO',
            status: 'COMPLETED'
          }
        });

        await tx.notificacion.create({
          data: {
            usuarioId: mentor.usuarioId,
            titulo: '✅ Renovación Automática Exitosa',
            mensaje: `Tu membresía se ha renovado automáticamente. Nueva expiración: ${newExpiryDate.toLocaleDateString('es-MX')}`,
            tipo: 'SYSTEM',
            leida: false
          }
        });
      });

      console.log(`✅ Auto-renovación exitosa para mentor ${mentor.id}`);

      return NextResponse.json({ received: true, status: 'auto-renewed' });
    }

    // Fallo en pago de factura (invoice.payment_failed)
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      const mentor = await prisma.perfilMentor.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        include: { usuario: true }
      });

      if (!mentor) {
        console.error('Mentor not found for failed payment:', subscriptionId);
        return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
      }

      // Registrar intento fallido
      await prisma.$transaction(async (tx) => {
        await tx.mentorMembershipRenewal.create({
          data: {
            mentorId: mentor.id,
            previousExpiryDate: mentor.membershipExpiryDate || new Date(),
            newExpiryDate: mentor.membershipExpiryDate || new Date(),
            amountPaid: 0,
            paymentIntentId: invoice.payment_intent as string || 'failed',
            renewalType: 'AUTO',
            status: 'FAILED',
            failureReason: invoice.last_finalization_error?.message || 'Payment failed'
          }
        });

        await tx.notificacion.create({
          data: {
            usuarioId: mentor.usuarioId,
            titulo: '⚠️ Fallo en Renovación Automática',
            mensaje: `No pudimos procesar el pago de tu renovación. Por favor actualiza tu método de pago para evitar la suspensión de tu membresía.`,
            tipo: 'WARNING',
            leida: false
          }
        });
      });

      console.log(`❌ Fallo en renovación automática para mentor ${mentor.id}`);

      // TODO: Enviar email de alerta
      // await sendEmail({
      //   to: mentor.usuario.email,
      //   subject: '⚠️ Problema con tu Renovación - Acción Requerida',
      //   template: 'renewal-failed',
      //   data: { name: mentor.usuario.nombre }
      // });

      return NextResponse.json({ received: true, status: 'payment-failed' });
    }

    // Suscripción cancelada (customer.subscription.deleted)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      const mentor = await prisma.perfilMentor.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        include: { usuario: true }
      });

      if (!mentor) {
        console.error('Mentor not found for deleted subscription:', subscriptionId);
        return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
      }

      // Desactivar auto-renovación
      await prisma.$transaction(async (tx) => {
        await tx.perfilMentor.update({
          where: { id: mentor.id },
          data: {
            autoRenewalEnabled: false,
            stripeSubscriptionId: null
          }
        });

        await tx.notificacion.create({
          data: {
            usuarioId: mentor.usuarioId,
            titulo: 'ℹ️ Auto-Renovación Desactivada',
            mensaje: `Tu suscripción ha sido cancelada. Tu membresía permanecerá activa hasta ${mentor.membershipExpiryDate?.toLocaleDateString('es-MX')}. Podrás renovar manualmente cuando lo desees.`,
            tipo: 'INFO',
            leida: false
          }
        });
      });

      console.log(`ℹ️ Suscripción cancelada para mentor ${mentor.id}`);

      return NextResponse.json({ received: true, status: 'subscription-cancelled' });
    }

    // Otros eventos no manejados
    return NextResponse.json({ received: true, status: 'unhandled' });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 500 }
    );
  }
}
