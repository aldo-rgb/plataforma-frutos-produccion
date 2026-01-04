import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * POST /api/mentor/membership/renew
 * Crea una sesión de pago para renovar la membresía
 * Body: { enableAutoRenewal?: boolean }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);

    // Leer configuración del body
    const body = await req.json();
    const { enableAutoRenewal = false } = body;

    // Buscar perfil de mentor
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: userId },
      include: {
        Usuario: true
      }
    });

    if (!perfilMentor) {
      return NextResponse.json(
        { error: 'No tienes un perfil de mentor' },
        { status: 404 }
      );
    }

    // Crear o recuperar customer de Stripe
    let stripeCustomerId = perfilMentor.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: perfilMentor.Usuario.email,
        name: perfilMentor.Usuario.nombre,
        metadata: {
          userId: userId.toString(),
          mentorId: perfilMentor.id.toString()
        }
      });
      stripeCustomerId = customer.id;

      await prisma.perfilMentor.update({
        where: { id: perfilMentor.id },
        data: { stripeCustomerId }
      });
    }

    // Configurar sesión de pago según tipo de renovación
    const sessionConfig: any = {
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/mi-membresia?renewed=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/mi-membresia?cancelled=true`,
      metadata: {
        type: 'mentor_membership_renewal',
        mentorId: perfilMentor.id.toString(),
        userId: userId.toString(),
        renewalType: enableAutoRenewal ? 'subscription' : 'manual'
      }
    };

    if (enableAutoRenewal) {
      // Suscripción anual con auto-renovación
      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Membresía Anual - Mentor F.R.U.T.O.S. (Auto-Renovación)',
              description: 'Acceso completo con renovación automática anual',
            },
            unit_amount: 99900, // $999 MXN
            recurring: {
              interval: 'year'
            }
          },
          quantity: 1
        }
      ];
    } else {
      // Pago único (renovación manual)
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Renovación de Membresía Anual - Mentor F.R.U.T.O.S.',
              description: 'Acceso completo a plataforma de mentoría por 1 año',
            },
            unit_amount: 99900 // $999 MXN
          },
          quantity: 1
        }
      ];
    }

    // Crear sesión de checkout
    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    });

  } catch (error) {
    console.error('Error creating renewal session:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión de renovación' },
      { status: 500 }
    );
  }
}
