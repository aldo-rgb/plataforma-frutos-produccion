import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { ticketId } = await params;

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (ticket.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a este ticket' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        level: ticket.level,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        costAtPurchase: ticket.costAtPurchase ? parseFloat(ticket.costAtPurchase.toString()) : 0,
        amountPaid: ticket.amountPaid ? parseFloat(ticket.amountPaid.toString()) : 0,
        vision: {
          id: ticket.vision?.id,
          nombre: ticket.vision?.nombre || 'Sin visión',
          advancedStartDate: ticket.vision?.advancedStartDate?.toISOString() || null,
        },
        organization: {
          id: ticket.organization?.id,
          name: ticket.organization?.name || 'Sin organización',
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
