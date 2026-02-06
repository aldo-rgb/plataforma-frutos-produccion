import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * ✅ Marcar pago como completado
 * POST /api/admin/payouts/[id]/mark-paid
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { rol: true },
    });

    if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const payoutId = parseInt(params.id);
    const body = await request.json();
    const { paymentMethod, transactionRef } = body;

    const payout = await prisma.mentorPayout.findUnique({
      where: { id: payoutId }
    });

    if (!payout) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    if (payout.status === 'PAID') {
      return NextResponse.json({ 
        error: 'Este pago ya fue marcado como pagado' 
      }, { status: 400 });
    }

    const updatedPayout = await prisma.mentorPayout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod,
        transactionRef,
      }
    });

    // TODO: Enviar email al mentor confirmando pago
    // await sendPaymentConfirmationToMentor(payout.mentorId, updatedPayout);

    return NextResponse.json({
      success: true,
      payout: updatedPayout,
      message: 'Pago marcado como completado'
    });

  } catch (error) {
    logger.error('❌ Error marcando pago:', error);
    return NextResponse.json(
      { error: 'Error al marcar pago como completado' },
      { status: 500 }
    );
  }
}
