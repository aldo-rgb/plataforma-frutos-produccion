import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Canjear código de regalo (crear tickets)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, userId, visionId } = body;

    if (!code || !userId || !visionId) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Buscar código
    const giftCode = await prisma.giftCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!giftCode) {
      return NextResponse.json(
        { success: false, error: 'Código inválido' },
        { status: 404 }
      );
    }

    if (giftCode.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: `Código ${giftCode.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar visión
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Si el código tiene visión específica, verificar que coincide
    if (giftCode.visionId && giftCode.visionId !== parseInt(visionId)) {
      return NextResponse.json(
        { success: false, error: 'Este código solo es válido para una visión específica' },
        { status: 400 }
      );
    }

    // Definir tickets a crear según tipo
    // GOLDEN y GOLDEN_DISCOUNT -> solo BASIC
    // PLATINUM -> los 3 niveles
    const ticketLevels: ('BASIC' | 'ADVANCED' | 'PL')[] = giftCode.type === 'PLATINUM' 
      ? ['BASIC', 'ADVANCED', 'PL']
      : ['BASIC'];

    // Crear tickets en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Marcar código como usado
      await tx.giftCode.update({
        where: { id: giftCode.id },
        data: {
          status: 'USED',
          usedBy: user.id,
          usedAt: new Date(),
        },
      });

      // Crear tickets
      const createdTickets = [];
      for (const level of ticketLevels) {
        const ticket = await tx.ticket.create({
          data: {
            ownerId: user.id,
            organizationId: giftCode.organizationId,
            visionId: parseInt(visionId),
            level: level,
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'GIFT',
            costAtPurchase: 0,
            amountPaid: 0,
            giftCodeId: giftCode.id,
            isTransferable: true,
            validUntil: vision.endDate || null,
          },
        });

        // Crear transacción de registro
        await tx.ticketTransaction.create({
          data: {
            ticketId: ticket.id,
            gateway: 'GIFT_CODE',
            transactionRef: giftCode.code,
            amount: 0,
            currency: 'MXN',
            status: 'SUCCESS',
            metadata: {
              giftCodeId: giftCode.id,
              giftCodeType: giftCode.type,
            },
          },
        });

        createdTickets.push({
          id: ticket.id,
          level: ticket.level,
          status: ticket.status,
        });
      }

      return createdTickets;
    });

    // Mensaje según tipo de código
    let successMessage = '';
    if (giftCode.type === 'GOLDEN') {
      successMessage = '🎫 ¡GOLDEN TICKET canjeado! Tienes acceso al Entrenamiento Básico';
    } else if (giftCode.type === 'GOLDEN_DISCOUNT') {
      successMessage = `🎫 ¡Código de descuento ${giftCode.discountPercentage}% canjeado! Tienes acceso al Entrenamiento Básico`;
    } else {
      successMessage = '💎 ¡PLATINUM TICKET canjeado! Tienes acceso a la Visión Completa';
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      tickets: result,
    });
  } catch (error) {
    console.error('Error redeeming gift code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al canjear código' },
      { status: 500 }
    );
  }
}
