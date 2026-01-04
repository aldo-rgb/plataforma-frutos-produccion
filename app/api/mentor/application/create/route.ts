import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * POST /api/mentor/application/create
 * Crea una solicitud de mentor y genera sesión de pago
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await req.json();

    // Verificar si ya tiene una solicitud
    const existingApplication = await prisma.mentorApplication.findUnique({
      where: { usuarioId: userId }
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud activa' },
        { status: 400 }
      );
    }

    // Crear la solicitud en estado DRAFT
    const application = await prisma.mentorApplication.create({
      data: {
        usuarioId: userId,
        status: 'DRAFT',
        titulo: data.titulo,
        especialidad: data.especialidad === 'Otros' ? data.especialidadOtra : data.especialidad,
        especialidadesSecundarias: data.especialidadesSecundarias || [],
        experienciaAnios: data.experienciaAnios,
        biografiaCompleta: data.biografiaCompleta,
        logros: data.logros || [],
        expertiseTags: data.expertiseTags || [],
        documentosUrls: data.documentosUrls || [],
        videoIntroUrl: data.videoIntroUrl || null
      }
    });

    // Crear sesión de Stripe
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Certificación de Mentor F.R.U.T.O.S.',
              description: 'Pago único para solicitud de mentor',
              images: ['https://tudominio.com/mentor-badge.png']
            },
            unit_amount: 99900 // $999 MXN en centavos
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/solicitar-mentor/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/solicitar-mentor?cancelled=true`,
      client_reference_id: userId.toString(),
      metadata: {
        applicationId: application.id.toString(),
        userId: userId.toString(),
        type: 'mentor_application'
      }
    });

    // Guardar el payment intent
    await prisma.mentorApplication.update({
      where: { id: application.id },
      data: {
        paymentIntentId: checkoutSession.id
      }
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
      applicationId: application.id
    });

  } catch (error) {
    console.error('Error creating application:', error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error al crear solicitud',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
