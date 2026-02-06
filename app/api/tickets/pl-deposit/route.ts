import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
    logger.error('Error processing PL deposit:', error);
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

    // Find user's PL ticket that needs payment
    // Include any PL ticket that isn't fully paid
    const plTickets = await prisma.ticket.findMany({
      where: {
        ownerId: userId,
        level: 'PL',
        status: { notIn: ['CANCELLED', 'EXPIRED', 'USED'] as any },
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
    
    // Filter to find a ticket that needs payment
    const plTicket = plTickets.find(t => {
      // If paymentStatus is PAID or GIFT and amountPaid >= costAtPurchase, it's fully paid
      const isPaid = ['PAID', 'GIFT'].includes(t.paymentStatus as string);
      const isFullyPaid = Number(t.amountPaid) >= Number(t.costAtPurchase || 0) && Number(t.costAtPurchase) > 0;
      
      // Return tickets that are NOT fully paid
      return !isPaid || !isFullyPaid;
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

    // Precios según estructura:
    // COMBO (Avanzado + PL) precio base = $14,500
    // Solo Avanzado = $7,500
    // APARTADO COMBO = $9,000 (precio promo para separar lugar en combo)
    // Solo PL base = $11,000
    // Completar COMBO = $7,000 ($14,500 - $7,500 ya pagados)
    // Depósito para completar APARTADO = $1,500 ($9,000 - $7,500 ya pagados)
    // Restante después de apartado = $5,500 ($14,500 - $9,000 apartado)
    const COMBO_PRICE = 14500;
    const ADVANCED_PRICE = 7500;
    const APARTADO_PRICE = 9000; // Precio promo para separar combo
    const PL_BASE_PRICE = 11000;
    const COMPLETE_COMBO_PRICE = COMBO_PRICE - ADVANCED_PRICE; // $7,000
    const DEPOSIT_FOR_APARTADO = APARTADO_PRICE - ADVANCED_PRICE; // $1,500 para completar apartado
    const REMAINING_AFTER_APARTADO = COMBO_PRICE - APARTADO_PRICE; // $5,500 restantes después de apartado

    // Determine current price based on status and deadlines
    let currentPrice = PL_BASE_PRICE; // Base price
    let canPayPromo = false;
    let hasDeposit = Number(plTicket.amountPaid) > 0;
    let depositAmount = hasDeposit ? Number(plTicket.amountPaid) : 0;

    if ((plTicket.status as any) === 'PROMO_AVAILABLE') {
      // Can still make deposit if deadline hasn't passed
      if (depositDeadline && now <= new Date(depositDeadline)) {
        currentPrice = PL_PROMO_PRICE; // Promo price available
        canPayPromo = true;
      }
    } else if ((plTicket.status as any) === 'RESERVED') {
      // Has deposit, check if promo deadline passed
      if (promoDeadline && now <= new Date(promoDeadline)) {
        currentPrice = PL_PROMO_PRICE; // Promo price still valid
        canPayPromo = true;
      } else {
        // Promo expired, deposit is lost
        currentPrice = PL_BASE_PRICE;
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
        basePrice: PL_BASE_PRICE,           // $11,000
        apartadoPrice: APARTADO_PRICE,      // $9,000 (apartado combo)
        comboPrice: COMBO_PRICE,            // $14,500
        advancedPaid: ADVANCED_PRICE,       // $7,500 (ya pagado)
        completeComboPrice: COMPLETE_COMBO_PRICE, // $7,000 para completar combo
        depositForApartado: DEPOSIT_FOR_APARTADO, // $1,500 para completar apartado
        remainingAfterApartado: REMAINING_AFTER_APARTADO, // $5,500 restante después de apartado
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
    logger.error('Error fetching PL deposit status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
