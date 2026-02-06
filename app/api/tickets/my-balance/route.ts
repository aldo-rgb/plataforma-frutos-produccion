import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // Obtener tickets con saldo pendiente
    const tickets = await prisma.ticket.findMany({
      where: {
        ownerId: userId,
        paymentStatus: {
          in: ['UNPAID', 'PARTIAL'],
        },
      },
      select: {
        id: true,
        level: true,
        costAtPurchase: true,
        amountPaid: true,
        paymentStatus: true,
      },
    });

    const levelNames: Record<string, string> = {
      BASIC: 'Nivel Básico',
      ADVANCED: 'Nivel Avanzado',
      PL: 'Performance Leadership',
    };

    const balances = tickets.map((ticket) => {
      const totalCost = ticket.costAtPurchase ? parseFloat(ticket.costAtPurchase.toString()) : 0;
      const amountPaid = ticket.amountPaid ? parseFloat(ticket.amountPaid.toString()) : 0;
      const balance = Math.max(0, totalCost - amountPaid);

      return {
        ticketId: ticket.id,
        level: ticket.level,
        levelName: levelNames[ticket.level] || ticket.level,
        totalCost,
        amountPaid,
        balance,
        paymentStatus: ticket.paymentStatus,
      };
    });

    const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);

    return NextResponse.json({
      success: true,
      balances,
      totalBalance,
      hasUnpaidTickets: tickets.some(t => t.paymentStatus === 'UNPAID'),
    });
  } catch (error) {
    logger.error('Error fetching ticket balances:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener balances' },
      { status: 500 }
    );
  }
}
