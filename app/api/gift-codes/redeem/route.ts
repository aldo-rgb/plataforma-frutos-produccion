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
            id: crypto.randomUUID(),
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
            updatedAt: new Date(),
          },
        });

        // Crear transacción de registro
        await tx.ticketTransaction.create({
          data: {
            id: crypto.randomUUID(),
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
        // Para gift codes, NO se genera comisión porque es un código de descuento/regalo
        const estimatedValue = giftCode.type === 'PLATINUM' ? 21000 : 2500;
        const productType = giftCode.type === 'PLATINUM' ? 'COMBO' : 'BASIC';
        
        const ambassadorResult = await processAmbassadorCommission({
          referralCode: userWithReferrer.invitedByUser.referralCode,
          referredUserId: user.id,
          ticketId: `GIFT-${giftCode.id}-${user.id}`,
          productType,
          saleAmount: estimatedValue,
          organizationId: giftCode.organizationId,
          visionId: parseInt(visionId),
          usedGiftCode: true // No genera comisión para códigos de regalo
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
        Organization: true,
        Vision: true,
      },
    });

    logger.debug('[REDEEM CASH] Código encontrado:', paymentCode ? { id: paymentCode.id, status: paymentCode.status, amount: paymentCode.amount, reference: paymentCode.reference } : null);

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

    const amount = Number(paymentCode.amount);
    const reference = paymentCode.reference?.toLowerCase() || '';
    
    // 🎯 DETECTAR NIVEL BASADO EN MONTO Y REFERENCIA
    // ADVANCED: $7,500 (promo), $9,000 (promo combo), $9,500 (normal), $14,500 (combo)
    // PL: $7,000 (normal)
    // BASIC: $2,500 (normal), $1,500 (abono)
    let targetLevel: 'BASIC' | 'ADVANCED' | 'PL' = 'BASIC';
    
    if (reference.includes('avanzado') || reference.includes('advanced') ||
        amount === 7500 || amount === 9000 || amount === 9500 || amount === 14500) {
      targetLevel = 'ADVANCED';
    } else if (reference.includes('liderato') || reference.includes('pl') || amount === 7000) {
      targetLevel = 'PL';
    }
    
    logger.debug('[REDEEM CASH] Nivel detectado:', targetLevel, 'basado en monto:', amount, 'referencia:', reference);

    // Determinar la visión a usar
    let targetVisionId: number | null = null;

    if (visionId) {
      targetVisionId = parseInt(String(visionId));
      logger.debug('[REDEEM CASH] Usando visionId del parámetro:', targetVisionId);
    } else if (paymentCode.visionId) {
      targetVisionId = paymentCode.visionId;
      logger.debug('[REDEEM CASH] Usando visionId del PaymentCode:', targetVisionId);
    }
    
    // Si no hay visión, buscar la próxima visión activa de la organización
    if (!targetVisionId) {
      const nextVision = await prisma.vision.findFirst({
        where: {
          organizationId: paymentCode.organizationId,
          OR: [
            { endDate: { gte: new Date() } },
            { advancedEndDate: { gte: new Date() } },
            { plWeekend3EndDate: { gte: new Date() } }
          ]
        },
        orderBy: { startDate: 'asc' }
      });
      
      if (nextVision) {
        targetVisionId = nextVision.id;
        logger.debug('[REDEEM CASH] Usando próxima visión activa:', targetVisionId);
      }
    }
    
    if (!targetVisionId) {
      return NextResponse.json(
        { success: false, error: 'No se encontró una visión activa para este pago' },
        { status: 400 }
      );
    }

    // Obtener la visión con datos del coordinador
    const vision = await prisma.vision.findUnique({
      where: { id: targetVisionId },
      select: { 
        id: true, 
        coordinadorId: true, 
        endDate: true, 
        advancedEndDate: true, 
        plWeekend3EndDate: true,
        nombre: true 
      }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 400 }
      );
    }

    // Buscar enrollment existente para este nivel
    let enrollment = await prisma.vision_enrollments.findFirst({
      where: { 
        userId: user.id,
        visionId: targetVisionId,
        level: targetLevel
      }
    });

    logger.debug('[REDEEM CASH] Enrollment existente para nivel', targetLevel, ':', enrollment?.id || 'NO EXISTE');

    // Transacción para crear todo junto
    const result = await prisma.$transaction(async (tx) => {
      // 1. Si no existe enrollment para este nivel, CREARLO
      if (!enrollment) {
        logger.debug('[REDEEM CASH] 🆕 Creando enrollment', targetLevel, 'para usuario:', user.id);
        
        enrollment = await tx.vision_enrollments.create({
          data: {
            userId: user.id,
            visionId: targetVisionId!,
            coordinatorId: vision.coordinadorId,
            level: targetLevel,
            enrollmentStatus: 'ENROLLED',
            paymentStatus: 'PAID',
            updatedAt: new Date()
          }
        });
        
        logger.debug('[REDEEM CASH] ✅ Enrollment', targetLevel, 'creado con ID:', enrollment.id);
      } else {
        // Actualizar enrollment existente a PAID
        await tx.vision_enrollments.update({
          where: { id: enrollment.id },
          data: { paymentStatus: 'PAID' }
        });
      }

      // 2. Actualizar el código como REDEEMED
      await tx.paymentCode.update({
        where: { id: paymentCode.id },
        data: {
          status: 'REDEEMED',
          redeemedById: user.id,
          redeemedAt: new Date(),
        },
      });

      // 3. Verificar si ya tiene ticket para esta visión y nivel
      const existingTicket = await tx.ticket.findFirst({
        where: {
          ownerId: user.id,
          visionId: targetVisionId!,
          level: targetLevel
        }
      });

      let ticket = existingTicket;

      // 4. Crear ticket si no existe
      if (!existingTicket) {
        logger.debug('[REDEEM CASH] 🎫 Creando ticket', targetLevel, 'para usuario:', user.id);
        
        // Determinar fecha de validez según nivel
        let validUntil = vision.endDate;
        if (targetLevel === 'ADVANCED') validUntil = vision.advancedEndDate || vision.endDate;
        if (targetLevel === 'PL') validUntil = vision.plWeekend3EndDate || vision.advancedEndDate || vision.endDate;
        
        ticket = await tx.ticket.create({
          data: {
            id: crypto.randomUUID(),
            ownerId: user.id,
            organizationId: paymentCode.organizationId,
            visionId: targetVisionId!,
            level: targetLevel,
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            costAtPurchase: amount,
            amountPaid: amount,
            isTransferable: true,
            validUntil: validUntil,
            updatedAt: new Date(),
          }
        });

        // 5. Crear transacción del ticket
        await tx.ticketTransaction.create({
          data: {
            id: crypto.randomUUID(),
            ticketId: ticket.id,
            gateway: 'CASH_MANUAL',
            transactionRef: code,
            amount: amount,
            currency: 'MXN',
            status: 'SUCCESS',
            metadata: {
              paymentCodeId: paymentCode.id,
              userId: user.id,
              level: targetLevel
            }
          }
        });
        
        logger.debug('[REDEEM CASH] ✅ Ticket', targetLevel, 'creado con ID:', ticket.id);
      } else {
        // Actualizar ticket existente
        await tx.ticket.update({
          where: { id: existingTicket.id },
          data: {
            paymentStatus: 'PAID',
            amountPaid: { increment: amount },
            updatedAt: new Date()
          }
        });
      }

      // 6. Crear registro de pago
      await tx.payment.create({
        data: {
          userId: user.id,
          amount: amount,
          description: `Pago ${targetLevel} - Código ${code}`,
          status: 'COMPLETED',
          paymentMethod: 'CASH',
          transactionId: code,
          updatedAt: new Date()
        }
      });

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
        const ambassadorResult = await processAmbassadorCommission({
          referralCode: userWithReferrer.invitedByUser.referralCode,
          referredUserId: user.id,
          ticketId: result.id,
          productType: targetLevel,
          saleAmount: amount,
          organizationId: paymentCode.organizationId,
          visionId: targetVisionId!
        });
        
        if (ambassadorResult.success) {
          logger.debug(`🎁 Comisión ambassador (cash payment): ${ambassadorResult.message}`);
        }
      }
    } catch (ambassadorError) {
      logger.error('Error procesando comisión ambassador en cash payment:', ambassadorError);
    }

    logger.debug('[REDEEM CASH] ✅ Código canjeado exitosamente - Nivel:', targetLevel, 'Ticket:', result?.id);

    return NextResponse.json({
      success: true,
      message: `💵 Pago ${targetLevel} registrado: $${amount.toLocaleString()} MXN`,
      paymentCode: {
        id: paymentCode.id,
        code: paymentCode.code,
        amount: amount,
        status: 'REDEEMED',
      },
      enrollment: {
        id: enrollment?.id,
        level: targetLevel,
        visionId: targetVisionId
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
