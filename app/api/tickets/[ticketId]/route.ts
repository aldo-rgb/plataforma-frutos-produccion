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
    
    logger.info(`[Tickets] Fetching ticket: ${ticketId} for user: ${session.user.email}`);

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
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
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
          },
        },
        Organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      logger.warn(`[Tickets] Ticket not found: ${ticketId}`);
      return NextResponse.json(
        { success: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Verify ownership - but allow admins to see any ticket
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'COORDINADOR', 'TESORERO', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(user.rol);
    if (ticket.ownerId !== user.id && !isAdmin) {
      logger.warn(`[Tickets] Access denied: user ${user.id} trying to access ticket owned by ${ticket.ownerId}`);
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a este ticket' },
        { status: 403 }
      );
    }

    logger.info(`[Tickets] Successfully fetched ticket ${ticketId} - Level: ${ticket.level}, Status: ${ticket.paymentStatus}`);

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
          id: ticket.Vision?.id || null,
          nombre: ticket.Vision?.nombre || 'Sin visión',
          advancedStartDate: ticket.Vision?.advancedStartDate?.toISOString() || null,
        },
        organization: {
          id: ticket.Organization?.id || null,
          name: ticket.Organization?.name || 'Sin organización',
        },
      },
    });
  } catch (error: any) {
    logger.error('[Tickets] Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
