import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar tickets con pago pendiente
    const pendingTickets = await prisma.ticket.findMany({
      where: {
        ownerId: usuario.id,
        OR: [
          { status: 'PENDING_PAYMENT' },
          { paymentStatus: 'PENDING' },
          { paymentStatus: 'PARTIAL' },
        ],
      },
      select: {
        id: true,
        level: true,
        status: true,
        paymentStatus: true,
        costAtPurchase: true,
        amountPaid: true,
        Vision: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Formatear respuesta
    const formattedTickets = pendingTickets.map(ticket => ({
      id: ticket.id,
      level: ticket.level,
      status: ticket.status,
      paymentStatus: ticket.paymentStatus,
      costAtPurchase: ticket.costAtPurchase || 0,
      amountPaid: ticket.amountPaid || 0,
      vision: {
        nombre: ticket.Vision?.nombre || 'Sin visión',
      },
    }));

    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
      totalPending: formattedTickets.reduce((sum, t) => sum + ((t.costAtPurchase || 0) - (t.amountPaid || 0)), 0),
    });
  } catch (error) {
    logger.error('Error fetching pending tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
