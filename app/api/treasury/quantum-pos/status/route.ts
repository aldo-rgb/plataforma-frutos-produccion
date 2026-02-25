import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Verificar estado de una transacción POS
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!transactionId && !paymentIntentId) {
      return NextResponse.json({ error: 'Se requiere transactionId o paymentIntentId' }, { status: 400 });
    }

    // Buscar la transacción
    const transaction = await prisma.quantumPOSTransaction.findFirst({
      where: transactionId 
        ? { id: transactionId }
        : { paymentIntentId: paymentIntentId! },
      include: {
        participant: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        generatedTicket: {
          select: {
            id: true,
            codigo: true,
            level: true,
            status: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        paymentIntentId: transaction.paymentIntentId,
        status: transaction.status,
        amount: Number(transaction.amount),
        ticketLevel: transaction.ticketLevel,
        mpPaymentId: transaction.mpPaymentId,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        completedAt: transaction.completedAt,
        participant: transaction.participant,
        vision: transaction.vision,
        ticket: transaction.generatedTicket
      }
    });
  } catch (error) {
    console.error('Error checking POS transaction status:', error);
    return NextResponse.json({ error: 'Error al verificar estado' }, { status: 500 });
  }
}
