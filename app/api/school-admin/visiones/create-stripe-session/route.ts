import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import logger from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { visionId, mentorId, studentCount, totalAmount, orderId } = await req.json();

    if (!visionId || !mentorId || !studentCount || !totalAmount) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Obtener información del mentor y la visión
    const [mentor, vision] = await Promise.all([
      prisma.usuario.findUnique({
        where: { id: mentorId },
        select: { 
          id: true, 
          nombre: true,
          PerfilMentor: {
            select: { precioDisciplina: true }
          }
        }
      }),
      prisma.vision.findUnique({
        where: { id: visionId },
        select: { id: true, nombre: true }
      })
    ]);

    if (!mentor || !vision) {
      return NextResponse.json({ error: 'Mentor o visión no encontrada' }, { status: 404 });
    }

    const pricePerCall = mentor.PerfilMentor?.precioDisciplina || 90;

    // Crear sesión de Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Mentorías - ${mentor.nombre}`,
              description: `${studentCount} estudiantes × $${pricePerCall}/llamada × 18 llamadas`,
            },
            unit_amount: Math.round(totalAmount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/api/school-admin/visiones/stripe-success?session_id={CHECKOUT_SESSION_ID}&vision_id=${visionId}&mentor_id=${mentorId}&order_id=${orderId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones/${visionId}?payment=cancelled`,
      metadata: {
        visionId: visionId.toString(),
        mentorId: mentorId.toString(),
        studentCount: studentCount.toString(),
        orderId: orderId || '',
        userId: session.user.id.toString(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    });

  } catch (error) {
    logger.error('Error creating Stripe session:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}
