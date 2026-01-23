import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEPOSIT_AMOUNT = 1500; // $1,500 MXN para reservar precio promo

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { ticketId, paymentMethod, giftCode } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'ID de ticket requerido' },
        { status: 400 }
      );
    }

    // Get the PL ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
            advancedEndDate: true,
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

    // Verify ticket belongs to user
    if (ticket.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Este ticket no te pertenece' },
        { status: 403 }
      );
    }

    // Verify it's a PL ticket with PROMO_AVAILABLE status
    if (ticket.level !== 'PL' || (ticket.status as any) !== 'PROMO_AVAILABLE') {
      return NextResponse.json(
        { success: false, error: 'Este ticket no es elegible para depósito de reserva' },
        { status: 400 }
      );
    }

    // Check if deposit deadline has passed (validUntil for PROMO_AVAILABLE tickets)
    if (ticket.validUntil && new Date() > new Date(ticket.validUntil)) {
      return NextResponse.json(
        { success: false, error: 'El plazo para reservar con depósito ha expirado' },
        { status: 400 }
      );
    }

    // If using gift code, validate and redeem it
    if (giftCode) {
      const validateRes = await fetch(`${process.env.NEXTAUTH_URL}/api/gift-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: giftCode,
          organizationId: ticket.organizationId,
        }),
      });
      
      const validateData = await validateRes.json();
      
      if (!validateData.success) {
        return NextResponse.json(
          { success: false, error: validateData.error || 'Código inválido' },
          { status: 400 }
        );
      }

      // Check if code value covers the deposit
      if (validateData.giftCode.value < DEPOSIT_AMOUNT) {
        return NextResponse.json(
          { success: false, error: `El código no cubre el depósito completo de $${DEPOSIT_AMOUNT}` },
          { status: 400 }
        );
      }

      // Redeem the gift code
      const redeemRes = await fetch(`${process.env.NEXTAUTH_URL}/api/gift-codes/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: giftCode,
          userId: userId,
          visionId: ticket.visionId,
        }),
      });

      const redeemData = await redeemRes.json();
      
      if (!redeemData.success) {
        return NextResponse.json(
          { success: false, error: redeemData.error || 'Error al canjear código' },
          { status: 400 }
        );
      }
    }

    // Calculate new promo deadline: 11 PM of last day of ADVANCED
    let promoPaymentDeadline: Date | null = null;
    if (ticket.vision?.advancedEndDate) {
      promoPaymentDeadline = new Date(ticket.vision.advancedEndDate);
      promoPaymentDeadline.setHours(23, 0, 0, 0); // 11 PM
    }

    // Update the ticket with deposit payment
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'RESERVED' as any, // Changed from PROMO_AVAILABLE to RESERVED
        type: 'PROMO_RESERVED' as any, // Mark as reserved with promo price
        amountPaid: DEPOSIT_AMOUNT, // $1,500 deposit
        // Update validUntil to promo payment deadline (11 PM last day of advanced)
        validUntil: promoPaymentDeadline,
      },
    });

    // Update the enrollment payment status
    await prisma.vision_enrollments.updateMany({
      where: {
        userId: userId,
        visionId: ticket.visionId,
        level: 'PL',
      },
      data: {
        enrollmentStatus: 'RESERVED',
        paymentStatus: 'PARTIAL', // Partially paid (deposit only)
      },
    });

    return NextResponse.json({
      success: true,
      message: '¡Depósito realizado! Has reservado el precio promocional de $9,000 para Liderato.',
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        amountPaid: updatedTicket.amountPaid,
        costAtPurchase: updatedTicket.costAtPurchase, // $9,000 promo price
        remainingBalance: Number(updatedTicket.costAtPurchase || 9000) - DEPOSIT_AMOUNT, // $7,500
        depositAmount: DEPOSIT_AMOUNT,
        promoDeadline: promoPaymentDeadline?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error processing PL deposit:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET: Check deposit status and deadlines for a user's PL ticket
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Find user's PL ticket that's either PROMO_AVAILABLE or RESERVED
    const plTicket = await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        level: 'PL',
        status: { in: ['PROMO_AVAILABLE', 'RESERVED', 'PENDING_PAYMENT'] as any },
      },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
            advancedEndDate: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!plTicket) {
      return NextResponse.json({
        success: true,
        hasPlTicket: false,
        message: 'No tienes un ticket de Liderato pendiente',
      });
    }

    const now = new Date();
    const depositDeadline = (plTicket.status as any) === 'PROMO_AVAILABLE' ? plTicket.validUntil : null;
    const promoDeadline = (plTicket.status as any) === 'RESERVED' ? plTicket.validUntil : 
      (plTicket.vision?.advancedEndDate ? new Date(new Date(plTicket.vision.advancedEndDate).setHours(23, 0, 0, 0)) : null);

    // Determine current price based on status and deadlines
    let currentPrice = 11000; // Base price
    let canPayPromo = false;
    let hasDeposit = Number(plTicket.amountPaid) > 0;
    let depositAmount = hasDeposit ? Number(plTicket.amountPaid) : 0;

    if ((plTicket.status as any) === 'PROMO_AVAILABLE') {
      // Can still make deposit if deadline hasn't passed
      if (depositDeadline && now <= new Date(depositDeadline)) {
        currentPrice = 9000; // Promo price available
        canPayPromo = true;
      }
    } else if ((plTicket.status as any) === 'RESERVED') {
      // Has deposit, check if promo deadline passed
      if (promoDeadline && now <= new Date(promoDeadline)) {
        currentPrice = 9000; // Promo price still valid
        canPayPromo = true;
      } else {
        // Promo expired, deposit is lost
        currentPrice = 11000;
        depositAmount = 0; // Lost the deposit
      }
    }

    const amountToPay = currentPrice - (canPayPromo ? depositAmount : 0);

    return NextResponse.json({
      success: true,
      hasPlTicket: true,
      ticket: {
        id: plTicket.id,
        status: plTicket.status,
        type: plTicket.type,
        costAtPurchase: plTicket.costAtPurchase,
        amountPaid: plTicket.amountPaid,
        visionName: plTicket.vision?.nombre,
        organizationName: plTicket.organization?.name,
      },
      pricing: {
        basePrice: 11000,
        promoPrice: 9000,
        currentPrice: currentPrice,
        depositAmount: depositAmount,
        hasDeposit: hasDeposit,
        amountToPay: amountToPay,
        canPayPromo: canPayPromo,
      },
      deadlines: {
        depositDeadline: depositDeadline?.toISOString() || null,
        promoDeadline: promoDeadline?.toISOString() || null,
        depositExpired: depositDeadline ? now > new Date(depositDeadline) : true,
        promoExpired: promoDeadline ? now > new Date(promoDeadline) : true,
      },
    });
  } catch (error: any) {
    console.error('Error fetching PL deposit status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
