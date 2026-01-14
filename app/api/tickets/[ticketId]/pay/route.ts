import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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
    const body = await request.json();
    const { amountPaid, paymentMethod, giftCode } = body;

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

    // Check if ticket is pending payment
    if (ticket.status !== 'PENDING_PAYMENT' && ticket.paymentStatus !== 'PENDING' && ticket.paymentStatus !== 'PARTIAL') {
      return NextResponse.json(
        { success: false, error: 'Este ticket no tiene pagos pendientes' },
        { status: 400 }
      );
    }

    // Calculate new amount paid
    const currentAmountPaid = ticket.amountPaid ? parseFloat(ticket.amountPaid.toString()) : 0;
    const costAtPurchase = ticket.costAtPurchase ? parseFloat(ticket.costAtPurchase.toString()) : 0;
    const newAmountPaid = currentAmountPaid + (amountPaid || 0);
    const isFullyPaid = newAmountPaid >= costAtPurchase;

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        amountPaid: newAmountPaid,
        status: isFullyPaid ? 'ACTIVE' : ticket.status,
        paymentStatus: isFullyPaid ? 'PAID' : 'PARTIAL',
        updatedAt: new Date(),
      },
    });

    // If ticket is for PL and now fully paid, also update the enrollment
    if (isFullyPaid && ticket.level === 'PL') {
      await prisma.vision_enrollments.updateMany({
        where: {
          userId: user.id,
          visionId: ticket.visionId,
          level: 'PL',
        },
        data: {
          enrollmentStatus: 'ACTIVE',
          paymentStatus: 'PAID',
          updatedAt: new Date(),
        },
      });
    }

    console.log(`[PAY TICKET] Ticket ${ticketId} actualizado:`, {
      previousAmount: currentAmountPaid,
      addedAmount: amountPaid,
      newAmount: newAmountPaid,
      isFullyPaid,
      paymentMethod,
      giftCode,
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        paymentStatus: updatedTicket.paymentStatus,
        amountPaid: newAmountPaid,
        isFullyPaid,
      },
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
