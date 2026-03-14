import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { processAmbassadorCommission } from '@/lib/ambassador-engine';
import { autoCreateMedicalFormInTransaction } from '@/lib/medical-form-helper';

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COORDINADOR', 'TESORERO', 'DIRECTOR', 'SUBDIRECTOR', 'SCHOOL_ADMIN'];

/**
 * POST /api/treasury/register-advanced
 * 
 * Registra pago de Avanzado desde Tesorería Express
 * Maneja diferentes tipos de pago:
 * - ADVANCED_PROMO ($7,500): Solo Avanzado, pagado completo
 * - ADVANCED ($9,500): Solo Avanzado precio base, pagado completo
 * - ADVANCED_UPGRADE_PL ($1,500): Complemento para quien ya pagó $7,500, convierte a apartado combo
 * - COMBO_ADV_PL_PROMO ($9,000): Apartado combo Avanzado+PL, deuda pendiente
 * - COMBO_ADV_PL ($14,500): Combo completo Avanzado+PL, todo pagado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Verificar permisos
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true, nombre: true },
    });

    if (!currentUser || !ALLOWED_ROLES.includes(currentUser.rol)) {
      logger.warn(`[Treasury] Usuario ${session.user.email} sin permisos para register-advanced`);
      return NextResponse.json({ success: false, error: 'Sin permisos para esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      participantId,   // ID del usuario que paga
      visionId,        // ID de la visión de Avanzado
      amount,          // Monto pagado
      priceType,       // ADVANCED_PROMO, ADVANCED, ADVANCED_UPGRADE_PL, COMBO_ADV_PL_PROMO, COMBO_ADV_PL
      paymentMethod,   // CASH o CARD
    } = body;

    logger.info(`📥 [Treasury] register-advanced recibido:`, { participantId, visionId, amount, priceType, paymentMethod });

    // Validaciones básicas
    if (!participantId || !visionId || !amount || !priceType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Datos incompletos. Se requiere: participantId, visionId, amount, priceType' 
      }, { status: 400 });
    }

    // Obtener participante
    const participant = await prisma.usuario.findUnique({
      where: { id: participantId },
      select: { id: true, nombre: true, email: true, organizationId: true },
    });

    if (!participant) {
      return NextResponse.json({ success: false, error: 'Participante no encontrado' }, { status: 404 });
    }

    // Obtener visión
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { 
        id: true, 
        nombre: true, 
        organizationId: true,
        advancedStartDate: true,
        advancedEndDate: true,
        plWeekend1StartDate: true,
        plWeekend3EndDate: true,
        enabledLevels: true,
      },
    });

    if (!vision) {
      return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar que la visión tenga ADVANCED habilitado
    const enabledLevels = vision.enabledLevels as string[] || [];
    if (!enabledLevels.includes('ADVANCED')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Esta visión no tiene habilitado el nivel Avanzado' 
      }, { status: 400 });
    }

    // Buscar enrollment BASIC del participante para obtener coordinatorId
    const basicEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participantId,
        level: 'BASIC',
        enrollmentStatus: { in: ['ACTIVE', 'ENROLLED', 'COMPLETED'] },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const coordinatorId = basicEnrollment?.coordinatorId || currentUser.id;

    // Verificar si ya tiene enrollment ADVANCED en esta visión
    const existingAdvanced = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participantId,
        visionId: visionId,
        level: 'ADVANCED',
      },
    });

    // Obtener precios configurados para la organización
    const defaultPrices = await prisma.defaultPrice.findMany({
      where: { organizationId: vision.organizationId! },
    });

    const priceMap: Record<string, any> = {};
    defaultPrices.forEach((p) => {
      priceMap[p.levelType] = {
        base: Number(p.basePrice),
        promo: p.promoPrice ? Number(p.promoPrice) : null,
        pago1: p.pago1 ? Number(p.pago1) : null,
        pago2: p.pago2 ? Number(p.pago2) : null,
      };
    });

    const advancedPromoPrice = priceMap['ADVANCED']?.promo || priceMap['ADVANCED']?.base || 7500;
    const plPromoPrice = priceMap['PL']?.promo || priceMap['PL']?.base || 5500;
    const comboPromoPrice = priceMap['COMBO_ADV_PL']?.promo || priceMap['COMBO_ADV_PL']?.base || 9000;
    const comboBasePrice = priceMap['COMBO_ADV_PL']?.base || 14500;
    const comboPago1 = priceMap['COMBO_ADV_PL']?.pago1 || 9000;
    const comboPago2 = priceMap['COMBO_ADV_PL']?.pago2 || 5500;

    // Transacción para crear todo
    const result = await prisma.$transaction(async (tx) => {
      let advancedTicket = null;
      let advancedEnrollment = null;
      let plTicket = null;
      let plEnrollment = null;
      let isCombo = false;
      let isApartado = false;
      let pendingDebt = 0;

      // Determinar qué crear según el tipo de precio
      switch (priceType) {
        case 'ADVANCED_PROMO':
        case 'ADVANCED':
          // Solo Avanzado - pagado completo
          if (existingAdvanced) {
            throw new Error('El participante ya tiene inscripción en Avanzado para esta visión');
          }

          advancedEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: participantId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'ADVANCED',
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'PAID',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          advancedTicket = await tx.ticket.create({
            data: {
              id: `TKT-ADV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              ownerId: participantId,
              organizationId: vision.organizationId!,
              visionId: visionId,
              level: 'ADVANCED',
              type: 'STANDARD',
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              costAtPurchase: parseFloat(amount),
              amountPaid: parseFloat(amount),
              isTransferable: false,
              validUntil: vision.advancedEndDate,
              updatedAt: new Date(),
            },
          });

          logger.info(`✅ [Treasury] Avanzado creado para ${participant.nombre} en ${vision.nombre}`);
          break;

        case 'ADVANCED_UPGRADE_PL':
          // Upgrade: Ya pagó Avanzado ($7,500), paga $1,500 más para apartar combo
          // Debe tener ticket ADVANCED existente
          const existingAdvancedTicket = await tx.ticket.findFirst({
            where: {
              ownerId: participantId,
              visionId: visionId,
              level: 'ADVANCED',
              status: 'ACTIVE',
            },
          });

          if (!existingAdvancedTicket) {
            throw new Error('El participante no tiene un ticket de Avanzado activo para hacer upgrade');
          }

          // Actualizar el ticket ADVANCED sumando el pago
          await tx.ticket.update({
            where: { id: existingAdvancedTicket.id },
            data: {
              amountPaid: { increment: parseFloat(amount) },
            },
          });

          isApartado = true;
          pendingDebt = comboBasePrice - (Number(existingAdvancedTicket.amountPaid) + parseFloat(amount));

          // Verificar si ya existe enrollment PL
          const existingPLEnrollment = await tx.vision_enrollments.findFirst({
            where: {
              userId: participantId,
              visionId: visionId,
              level: 'PL',
            },
          });

          if (!existingPLEnrollment) {
            // Crear enrollment PL como PENDING (apartado)
            plEnrollment = await tx.vision_enrollments.create({
              data: {
                userId: participantId,
                visionId: visionId,
                coordinatorId: coordinatorId,
                level: 'PL',
                enrollmentStatus: 'PENDING',
                paymentStatus: 'PARTIAL',
                enrolledAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }

          // Verificar si ya existe ticket PL
          const existingPLTicket = await tx.ticket.findFirst({
            where: {
              ownerId: participantId,
              visionId: visionId,
              level: 'PL',
            },
          });

          if (existingPLTicket) {
            // Actualizar ticket PL existente
            plTicket = await tx.ticket.update({
              where: { id: existingPLTicket.id },
              data: {
                type: 'APARTADO',
                status: 'PENDING_PAYMENT',
                paymentStatus: 'PARTIAL',
                amountPaid: { increment: parseFloat(amount) },
                updatedAt: new Date(),
              },
            });
          } else {
            // Crear ticket PL como APARTADO
            plTicket = await tx.ticket.create({
              data: {
                id: `TKT-PL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                ownerId: participantId,
                organizationId: vision.organizationId!,
                visionId: visionId,
                level: 'PL',
                type: 'APARTADO',
                status: 'PENDING_PAYMENT',
                paymentStatus: 'PARTIAL',
                costAtPurchase: comboBasePrice - advancedPromoPrice, // Costo del PL en combo
                amountPaid: parseFloat(amount), // Los $1,500 de upgrade
                isTransferable: false,
                validUntil: vision.plWeekend3EndDate,
                updatedAt: new Date(),
              },
            });
          }

          logger.info(`✅ [Treasury] Upgrade a PL (apartado) para ${participant.nombre}`);
          break;

        case 'COMBO_ADV_PL_PROMO':
          // Apartado combo $9,000 - Crea Avanzado pagado + PL como apartado
          if (existingAdvanced) {
            throw new Error('El participante ya tiene inscripción en Avanzado para esta visión');
          }

          isApartado = true;
          isCombo = true;
          pendingDebt = comboBasePrice - parseFloat(amount); // $14,500 - $9,000 = $5,500

          // Crear enrollment ADVANCED
          advancedEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: participantId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'ADVANCED',
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'PAID',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Crear ticket ADVANCED (se considera pagado con el precio promo)
          advancedTicket = await tx.ticket.create({
            data: {
              id: `TKT-ADV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              ownerId: participantId,
              organizationId: vision.organizationId!,
              visionId: visionId,
              level: 'ADVANCED',
              type: 'STANDARD',
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              costAtPurchase: advancedPromoPrice,
              amountPaid: advancedPromoPrice, // $7,500 del combo
              isTransferable: false,
              validUntil: vision.advancedEndDate,
              updatedAt: new Date(),
            },
          });

          // Crear enrollment PL como PENDING (apartado)
          plEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: participantId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'PL',
              enrollmentStatus: 'PENDING',
              paymentStatus: 'PARTIAL',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Crear ticket PL como APARTADO
          const plApartadoAmount = parseFloat(amount) - advancedPromoPrice; // $9,000 - $7,500 = $1,500
          plTicket = await tx.ticket.create({
            data: {
              id: `TKT-PL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              ownerId: participantId,
              organizationId: vision.organizationId!,
              visionId: visionId,
              level: 'PL',
              type: 'APARTADO',
              status: 'PENDING_PAYMENT',
              paymentStatus: 'PARTIAL',
              costAtPurchase: comboBasePrice - advancedPromoPrice, // Costo del PL ($7,000)
              amountPaid: plApartadoAmount, // Lo que sobra del pago para PL
              isTransferable: false,
              validUntil: vision.plWeekend3EndDate,
              updatedAt: new Date(),
            },
          });

          logger.info(`✅ [Treasury] Apartado Combo A+PL para ${participant.nombre} - Deuda: $${pendingDebt}`);
          break;

        case 'COMBO_ADV_PL':
          // Combo completo $14,500 - Todo pagado
          if (existingAdvanced) {
            throw new Error('El participante ya tiene inscripción en Avanzado para esta visión');
          }

          isCombo = true;

          // Crear enrollment ADVANCED
          advancedEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: participantId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'ADVANCED',
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'PAID',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Crear ticket ADVANCED
          advancedTicket = await tx.ticket.create({
            data: {
              id: `TKT-ADV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              ownerId: participantId,
              organizationId: vision.organizationId!,
              visionId: visionId,
              level: 'ADVANCED',
              type: 'STANDARD',
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              costAtPurchase: advancedPromoPrice,
              amountPaid: advancedPromoPrice,
              isTransferable: false,
              validUntil: vision.advancedEndDate,
              updatedAt: new Date(),
            },
          });

          // Crear enrollment PL como ACTIVE (pagado)
          plEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: participantId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'PL',
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'PAID',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Crear ticket PL como ACTIVE (pagado)
          plTicket = await tx.ticket.create({
            data: {
              id: `TKT-PL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              ownerId: participantId,
              organizationId: vision.organizationId!,
              visionId: visionId,
              level: 'PL',
              type: 'STANDARD',
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              costAtPurchase: comboBasePrice - advancedPromoPrice,
              amountPaid: comboBasePrice - advancedPromoPrice, // $7,000
              isTransferable: false,
              validUntil: vision.plWeekend3EndDate,
              updatedAt: new Date(),
            },
          });

          logger.info(`✅ [Treasury] Combo completo A+PL para ${participant.nombre}`);
          break;

        case 'COMBO_ADV_PL_PAGO1':
          // Primer pago del combo (apartado) - Crea ADVANCED + PL como apartado
          if (existingAdvanced) {
            throw new Error('El participante ya tiene inscripción en Avanzado para esta visión');
          }

          isApartado = true;
          isCombo = true;
          pendingDebt = comboBasePrice - parseFloat(amount); // Lo que falta por pagar

          // Crear enrollment ADVANCED como ACTIVE
          advancedEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: participantId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'ADVANCED',
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'PAID',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Crear ticket ADVANCED (pagado con parte del pago)
          advancedTicket = await tx.ticket.create({
            data: {
              id: `TKT-ADV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              ownerId: participantId,
              organizationId: vision.organizationId!,
              visionId: visionId,
              level: 'ADVANCED',
              type: 'STANDARD',
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              costAtPurchase: advancedPromoPrice,
              amountPaid: advancedPromoPrice,
              isTransferable: false,
              validUntil: vision.advancedEndDate,
              updatedAt: new Date(),
            },
          });

          // Crear enrollment PL como PENDING (apartado)
          plEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: participantId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'PL',
              enrollmentStatus: 'PENDING',
              paymentStatus: 'PARTIAL',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Crear ticket PL como APARTADO
          const pago1PLAmount = parseFloat(amount) - advancedPromoPrice;
          plTicket = await tx.ticket.create({
            data: {
              id: `TKT-PL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              ownerId: participantId,
              organizationId: vision.organizationId!,
              visionId: visionId,
              level: 'PL',
              type: 'APARTADO',
              status: 'PENDING_PAYMENT',
              paymentStatus: 'PARTIAL',
              costAtPurchase: comboBasePrice - advancedPromoPrice,
              amountPaid: pago1PLAmount > 0 ? pago1PLAmount : 0,
              isTransferable: false,
              validUntil: vision.plWeekend3EndDate,
              updatedAt: new Date(),
            },
          });

          logger.info(`✅ [Treasury] PAGO1 Combo A+PL para ${participant.nombre} - Deuda: $${pendingDebt}`);
          break;

        case 'COMBO_ADV_PL_PAGO2':
          // Segundo pago del combo (liquidación) - Completa el PL
          // Debe tener ticket PL en estado APARTADO/PENDING_PAYMENT
          const existingPLTicketForPago2 = await tx.ticket.findFirst({
            where: {
              ownerId: participantId,
              visionId: visionId,
              level: 'PL',
              status: 'PENDING_PAYMENT',
            },
          });

          if (!existingPLTicketForPago2) {
            throw new Error('El participante no tiene un apartado de PL pendiente de pago');
          }

          // Actualizar ticket PL a PAID
          plTicket = await tx.ticket.update({
            where: { id: existingPLTicketForPago2.id },
            data: {
              type: 'STANDARD',
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              amountPaid: { increment: parseFloat(amount) },
              updatedAt: new Date(),
            },
          });

          // Actualizar enrollment PL a ACTIVE
          const existingPLEnrollmentForPago2 = await tx.vision_enrollments.findFirst({
            where: {
              userId: participantId,
              visionId: visionId,
              level: 'PL',
            },
          });

          if (existingPLEnrollmentForPago2) {
            plEnrollment = await tx.vision_enrollments.update({
              where: { id: existingPLEnrollmentForPago2.id },
              data: {
                enrollmentStatus: 'ACTIVE',
                paymentStatus: 'PAID',
                updatedAt: new Date(),
              },
            });
          }

          isCombo = true;
          logger.info(`✅ [Treasury] PAGO2 (Liquidación) Combo A+PL para ${participant.nombre}`);
          break;

        default:
          throw new Error(`Tipo de precio no reconocido: ${priceType}`);
      }

      // Crear PaymentCode como REDEEMED
      const paymentCodeId = crypto.randomUUID();
      let codePrefix = 'ADV';
      if (isCombo && !isApartado) codePrefix = 'COMBO-ADV';
      if (isApartado) codePrefix = 'APARTADO';
      if (priceType === 'COMBO_ADV_PL_PAGO2') codePrefix = 'LIQUIDACION';
      
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const paymentCodeValue = `${codePrefix}-${timestamp}-${randomSuffix}`;

      let referenceText = `Avanzado - ${participant.nombre}`;
      if (priceType === 'COMBO_ADV_PL_PAGO1') {
        referenceText = `1er Pago Combo A+PL - ${participant.nombre} (Deuda: $${pendingDebt.toLocaleString()})`;
      } else if (priceType === 'COMBO_ADV_PL_PAGO2') {
        referenceText = `2do Pago (Liquidación) Combo A+PL - ${participant.nombre}`;
      } else if (isCombo && !isApartado) {
        referenceText = `Combo Avanzado+PL - ${participant.nombre}`;
      } else if (isApartado) {
        referenceText = `Apartado Combo A+PL - ${participant.nombre} (Deuda: $${pendingDebt.toLocaleString()})`;
      } else if (priceType === 'ADVANCED_UPGRADE_PL') {
        referenceText = `Upgrade a PL (Apartado) - ${participant.nombre} (Deuda: $${pendingDebt.toLocaleString()})`;
      }

      const paymentCode = await tx.paymentCode.create({
        data: {
          id: paymentCodeId,
          code: paymentCodeValue,
          amount: parseFloat(amount),
          reference: referenceText,
          status: 'REDEEMED',
          organizationId: vision.organizationId!,
          visionId: visionId,
          createdById: currentUser.id,
          redeemedById: participantId,
          redeemedAt: new Date(),
        },
      });

      logger.info(`✅ [Treasury] PaymentCode creado: ${paymentCode.code}`);

      // Auto-crear formulario médico si es visión 12
      const medicalFormResult = await autoCreateMedicalFormInTransaction(tx, participantId, visionId);
      if (medicalFormResult.created) {
        logger.info(`✅ [Treasury] Formulario médico auto-creado para usuario ${participantId}`);
      }

      return {
        participant,
        vision,
        advancedTicket,
        advancedEnrollment,
        plTicket,
        plEnrollment,
        paymentCode,
        isCombo,
        isApartado,
        pendingDebt,
        ticketLevels: isCombo ? ['ADVANCED', 'PL'] : ['ADVANCED'],
      };
    });

    // 🎁 PROCESAR COMISIÓN POR REFERIDO (si el participante fue invitado por alguien)
    let ambassadorCommission = null;
    try {
      // Buscar quién invitó originalmente al participante (desde su enrollment de BASIC)
      const originalEnrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: participantId,
          level: 'BASIC',
          invitedBy: { not: null }
        },
        select: {
          invitedBy: true,
          Usuario_vision_enrollments_invitedByToUsuario: {
            select: { referralCode: true, isGraduated: true }
          }
        },
        orderBy: { enrolledAt: 'asc' }
      });

      const inviter = originalEnrollment?.Usuario_vision_enrollments_invitedByToUsuario;
      if (originalEnrollment?.invitedBy && inviter?.referralCode && inviter?.isGraduated) {
        // Determinar el tipo de producto para la comisión:
        // - COMBO_ADV_PL: Cuando es combo Avanzado+PL (10%)
        // - ADVANCED: Solo Avanzado individual (10%)
        const productType = result.isCombo ? 'COMBO_ADV_PL' : 'ADVANCED';
        const commissionResult = await processAmbassadorCommission({
          referralCode: inviter.referralCode,
          referredUserId: participantId,
          ticketId: result.advancedTicket?.id || undefined,
          productType: productType,
          saleAmount: parseFloat(amount),
          organizationId: result.vision.organizationId!,
          visionId: result.vision.id
        });
        
        if (commissionResult.success) {
          ambassadorCommission = {
            ambassadorId: commissionResult.ambassadorId,
            amount: commissionResult.commissionAmount
          };
          logger.info(`💰 [Treasury] Comisión ADVANCED generada: $${commissionResult.commissionAmount} para embajador ${commissionResult.ambassadorId}`);
        } else {
          logger.info(`ℹ️ [Treasury] Sin comisión ADVANCED: ${commissionResult.message}`);
        }
      }
    } catch (commError) {
      logger.warn(`⚠️ [Treasury] Error al procesar comisión ADVANCED:`, commError);
    }

    return NextResponse.json({
      success: true,
      message: result.isApartado 
        ? `Apartado registrado. Deuda pendiente: $${result.pendingDebt.toLocaleString()}`
        : 'Pago de Avanzado registrado exitosamente',
      participant: {
        id: result.participant.id,
        nombre: result.participant.nombre,
      },
      enrollment: {
        visionId: result.vision.id,
        visionName: result.vision.nombre,
        level: 'ADVANCED',
        ticketId: result.advancedTicket?.id,
      },
      paymentCode: {
        id: result.paymentCode.id,
        code: result.paymentCode.code,
        amount: result.paymentCode.amount,
        reference: result.paymentCode.reference,
      },
      isCombo: result.isCombo,
      isApartado: result.isApartado,
      pendingDebt: result.pendingDebt,
      ticketLevels: result.ticketLevels,
      ticketsCreated: result.ticketLevels.length,
    });

  } catch (error: any) {
    logger.error('❌ [Treasury] Error en register-advanced:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
