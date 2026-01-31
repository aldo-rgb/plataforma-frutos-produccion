import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Stripe se inicializa solo si hay API key
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
}

/**
 * POST /api/mentor/application/create-checkout
 * 
 * Crea una sesión de checkout de Stripe para completar el pago
 * de una aplicación de mentor existente con status DRAFT
 * NOTA: Actualmente deshabilitado - usar códigos de regalo
 */
export async function POST(req: NextRequest) {
  try {
    // Stripe deshabilitado temporalmente
    if (!stripe) {
      return NextResponse.json(
        { error: 'Pasarela de pago no configurada. Por favor usa un código de regalo.' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'ID de aplicación requerido' }, { status: 400 });
    }

    // Verificar que la aplicación existe y pertenece al usuario
    const application = await prisma.mentorApplication.findFirst({
      where: {
        id: applicationId,
        usuarioId: session.user.id,
        status: 'DRAFT', // Solo permitir pago para aplicaciones en DRAFT
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada o ya fue pagada' },
        { status: 404 }
      );
    }

    // Obtener datos del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { nombre: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Crear sesión de checkout de Stripe
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Membresía Anual de Mentor - Quantum Matter',
              description: 'Acceso completo a la plataforma de mentoría por 12 meses',
              images: ['https://frutos.com/mentor-badge.png'],
            },
            unit_amount: 99900, // $999 USD
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/solicitar-mentor?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/solicitar-mentor?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        applicationId: applicationId.toString(),
        userId: session.user.id.toString(),
        type: 'mentor_application',
      },
    });

    // Actualizar el paymentIntentId en la aplicación
    await prisma.mentorApplication.update({
      where: { id: applicationId },
      data: {
        paymentIntentId: checkoutSession.payment_intent as string,
        updatedAt: new Date()
      },
    });

    if (!checkoutSession.url) {
      throw new Error('No se pudo generar la URL de pago');
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });

  } catch (error: any) {
    console.error('❌ Error creando checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}
