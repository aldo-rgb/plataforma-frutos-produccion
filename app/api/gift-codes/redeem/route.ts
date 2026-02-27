import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { processAmbassadorCommission } from '@/lib/ambassador-engine';

// POST - Canjear código de regalo o pago en efectivo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, userId, visionId, isCashPayment } = body;

    logger.debug('[REDEEM] Recibido:', { code, userId, visionId, isCashPayment });

    if (!code || !userId) {
      return NextResponse.json(
        { success: false, error: 'Código y userId son requeridos' },
        { status: 400 }
      );
    }

    const normalizedCode = code.toUpperCase().trim();
    
    // Si es un código CASH (pago en efectivo), procesarlo diferente
    const isCashCode = isCashPayment || normalizedCode.startsWith('CASH-');
    logger.debug('[REDEEM] Es código CASH:', isCashCode, 'Código normalizado:', normalizedCode);
    
    if (isCashCode) {
      // Para códigos CASH no necesitamos visionId
      return await redeemPaymentCode(normalizedCode, userId, visionId);
    }

    // Para gift codes sí necesitamos visionId
    if (!visionId) {
      return NextResponse.json(
        { success: false, error: 'visionId es requerido para códigos de regalo' },
        { status: 400 }
      );
    }

    // Buscar código de regalo
    const giftCode = await prisma.giftCode.findUnique({
      where: { code: normalizedCode },
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

    // Obtener coordinador de la visión para los enrollments
    const visionWithCoordinator = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: { coordinadorId: true }
    });

    // Crear tickets y enrollments en transacción
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

      // Si es PLATINUM, crear enrollments para ADVANCED y PL
      // (BASIC se crea en el registro del usuario)
      if (giftCode.type === 'PLATINUM') {
        const advancedAndPLLevels: ('ADVANCED' | 'PL')[] = ['ADVANCED', 'PL'];
        
        for (const level of advancedAndPLLevels) {
          // Verificar si ya existe el enrollment para evitar duplicados
          const existingEnrollment = await tx.vision_enrollments.findFirst({
            where: {
              userId: user.id,
              visionId: parseInt(visionId),
              level: level
            }
          });

          if (!existingEnrollment) {
            await tx.vision_enrollments.create({
              data: {
                userId: user.id,
                visionId: parseInt(visionId),
                coordinatorId: visionWithCoordinator?.coordinadorId || null,
                level: level,
                enrollmentStatus: 'ENROLLED',
                paymentStatus: 'PAID',
                updatedAt: new Date()
              }
            });
            logger.debug(`✅ Enrollment ${level} creado para usuario ${user.id} en visión ${visionId}`);
          }
        }
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

    // 🎁 QUANTUM AMBASSADORS: Procesar comisión si el usuario fue referido
    try {
      const userWithReferrer = await prisma.usuario.findUnique({
        where: { id: user.id },
        select: { 
          invitedBy: true, 
          invitedByUser: { select: { referralCode: true } }
        }
      });

      if (userWithReferrer?.invitedBy && userWithReferrer.invitedByUser?.referralCode) {
        // Para gift codes, usamos el valor del código o un estimado del precio
        const estimatedValue = giftCode.type === 'PLATINUM' ? 21000 : 2500;
        const productType = giftCode.type === 'PLATINUM' ? 'COMBO' : 'BASIC';
        
        const ambassadorResult = await processAmbassadorCommission({
          referralCode: userWithReferrer.invitedByUser.referralCode,
          referredUserId: user.id,
          ticketId: `GIFT-${giftCode.id}-${user.id}`,
          productType,
          saleAmount: estimatedValue,
          organizationId: giftCode.organizationId,
          visionId: parseInt(visionId)
        });
        
        if (ambassadorResult.success) {
          logger.debug(`🎁 Comisión ambassador (gift code): ${ambassadorResult.message}`);
        }
      }
    } catch (ambassadorError) {
      logger.error('Error procesando comisión ambassador en gift code:', ambassadorError);
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      tickets: result,
    });
  } catch (error) {
    logger.error('Error redeeming gift code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al canjear código' },
      { status: 500 }
    );
  }
}

// Función para canjear códigos de pago en efectivo (PaymentCode)
async function redeemPaymentCode(code: string, userId: string | number, visionId: string | number) {
  try {
    logger.debug('[REDEEM CASH] Buscando código:', code);
    
    // Buscar el código de pago
    const paymentCode = await prisma.paymentCode.findUnique({
      where: { code },
      include: {
        organization: true,
        vision: true,
      },
    });

    logger.debug('[REDEEM CASH] Código encontrado:', paymentCode ? { id: paymentCode.id, status: paymentCode.status } : null);

    if (!paymentCode) {
      return NextResponse.json(
        { success: false, error: 'Código de pago no encontrado' },
        { status: 404 }
      );
    }

    if (paymentCode.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        'REDEEMED': 'Este código ya fue utilizado',
        'CANCELLED': 'Este código fue cancelado',
        'EXPIRED': 'Este código ha expirado',
      };
      return NextResponse.json(
        { success: false, error: statusMessages[paymentCode.status] || 'Código no válido' },
        { status: 400 }
      );
    }

    // Verificar usuario
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(String(userId)) },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el enrollment del usuario para determinar la visión
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: { userId: user.id },
      include: {
        Vision: { select: { id: true, endDate: true } }
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'El usuario no tiene un enrollment activo' },
        { status: 400 }
      );
    }

    const amount = Number(paymentCode.amount);
    const userVisionId = enrollment.visionId;

    // Transacción para crear todo junto
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el código como REDEEMED
      logger.debug('[REDEEM CASH] Actualizando código a REDEEMED para usuario:', user.id);
      
      await tx.paymentCode.update({
        where: { id: paymentCode.id },
        data: {
          status: 'REDEEMED',
          redeemedById: user.id,
          redeemedAt: new Date(),
        },
      });

      // 2. Verificar si ya tiene ticket para esta visión y nivel
      const existingTicket = await tx.ticket.findFirst({
        where: {
          ownerId: user.id,
          visionId: userVisionId,
          level: enrollment.level as 'BASIC' | 'ADVANCED' | 'PL'
        }
      });

      let ticket = existingTicket;

      // 3. Crear ticket si no existe
      if (!existingTicket) {
        logger.debug('[REDEEM CASH] Creando ticket BASIC para usuario:', user.id);
        
        ticket = await tx.ticket.create({
          data: {
            ownerId: user.id,
            organizationId: paymentCode.organizationId,
            visionId: userVisionId,
            level: (enrollment.level as 'BASIC' | 'ADVANCED' | 'PL') || 'BASIC',
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            costAtPurchase: amount,
            amountPaid: amount,
            isTransferable: true,
            validUntil: enrollment.Vision?.endDate || null,
          }
        });

        // 4. Crear transacción del ticket
        await tx.ticketTransaction.create({
          data: {
            ticketId: ticket.id,
            gateway: 'CASH_MANUAL',
            transactionRef: code,
            amount: amount,
            currency: 'MXN',
            status: 'SUCCESS',
            metadata: {
              paymentCodeId: paymentCode.id,
              userId: user.id
            }
          }
        });
      }

      // 5. Crear registro de pago
      await tx.payment.create({
        data: {
          userId: user.id,
          amount: amount,
          description: `Pago ${enrollment.level || 'BÁSICO'} - Código ${code}`,
          status: 'COMPLETED',
          paymentMethod: 'CASH',
          transactionId: code,
          updatedAt: new Date()
        }
      });

      // 6. Actualizar enrollment paymentStatus
      await tx.vision_enrollments.update({
        where: { id: enrollment.id },
        data: { paymentStatus: 'PAID' }
      });

      logger.debug('[REDEEM CASH] Ticket y pago creados exitosamente');

      return ticket;
    });

    // 🎁 QUANTUM AMBASSADORS: Procesar comisión si el usuario fue referido
    try {
      const userWithReferrer = await prisma.usuario.findUnique({
        where: { id: user.id },
        select: { 
          invitedBy: true, 
          invitedByUser: { select: { referralCode: true } }
        }
      });

      if (userWithReferrer?.invitedBy && userWithReferrer.invitedByUser?.referralCode && result) {
        const productType = enrollment.level === 'ADVANCED' ? 'ADVANCED' : 
                           enrollment.level === 'PL' ? 'PL' : 'BASIC';
        
        const ambassadorResult = await processAmbassadorCommission({
          referralCode: userWithReferrer.invitedByUser.referralCode,
          referredUserId: user.id,
          ticketId: result.id,
          productType,
          saleAmount: amount,
          organizationId: paymentCode.organizationId,
          visionId: userVisionId
        });
        
        if (ambassadorResult.success) {
          logger.debug(`🎁 Comisión ambassador (cash payment): ${ambassadorResult.message}`);
        }
      }
    } catch (ambassadorError) {
      logger.error('Error procesando comisión ambassador en cash payment:', ambassadorError);
    }

    logger.debug('[REDEEM CASH] Código canjeado y ticket generado:', result?.id);

    return NextResponse.json({
      success: true,
      message: `💵 Código de pago canjeado: $${amount.toLocaleString()} MXN - Ticket generado`,
      paymentCode: {
        id: paymentCode.id,
        code: paymentCode.code,
        amount: amount,
        status: 'REDEEMED',
      },
      ticket: result ? {
        id: result.id,
        level: result.level,
        status: result.status
      } : null
    });
  } catch (error) {
    logger.error('[REDEEM CASH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al canjear código de pago' },
      { status: 500 }
    );
  }
}
