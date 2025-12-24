import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * 💳 API: Procesar Pago
 * POST /api/payments/process
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { 
      amount, 
      subscriptionId, 
      organizationId,
      paymentMethod, 
      isRenewal, 
      isSchoolPayment 
    } = await req.json();

    const userId = parseInt(session.user.id);

    // Validar monto
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // Crear registro de pago
    const payment = await prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscriptionId ? parseInt(subscriptionId) : null,
        organizationId: organizationId ? parseInt(organizationId) : null,
        amount,
        currency: 'MXN',
        status: 'PENDING',
        paymentMethod: paymentMethod || 'stripe',
        isRenewal: isRenewal || false,
        isSchoolPayment: isSchoolPayment || false,
        description: isSchoolPayment 
          ? `Pago de licencia escolar`
          : isRenewal 
            ? `Renovación de suscripción`
            : `Nueva suscripción`
      }
    });

    // TODO: Aquí integrarías con Stripe/PayPal
    // Por ahora simulamos que el pago fue exitoso
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        transactionId: `txn_${Date.now()}_${payment.id}`
      }
    });

    // Si es un pago de suscripción, actualizarla
    if (subscriptionId) {
      await prisma.subscription.update({
        where: { id: parseInt(subscriptionId) },
        data: { status: 'ACTIVE' }
      });
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: '¡Pago procesado exitosamente!'
    });

  } catch (error: any) {
    console.error('❌ Error procesando pago:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 📊 API: Obtener Historial de Pagos
 * GET /api/payments/process?userId=123
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        Subscription: {
          select: {
            plan: true,
            startDate: true,
            endDate: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      payments
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo pagos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
