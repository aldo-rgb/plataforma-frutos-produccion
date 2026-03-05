import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COORDINADOR', 'TESORERO', 'DIRECTOR', 'SUBDIRECTOR', 'SCHOOL_ADMIN'];

/**
 * POST /api/treasury/register-pl
 * 
 * Registra pago de Programa de Liderato desde Tesorería Express
 * Maneja diferentes tipos de pago:
 * - PL_PROMO ($5,500): Solo PL precio promocional, pagado completo
 * - PL ($11,000): Solo PL precio base, pagado completo
 * - PL_UPGRADE ($7,000): Para quien ya pagó Avanzado ($7,500) y quiere completar combo ($14,500)
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
      logger.warn(`[Treasury] Usuario ${session.user.email} sin permisos para register-pl`);
      return NextResponse.json({ success: false, error: 'Sin permisos para esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      participantId,   // ID del usuario que paga
      visionId,        // ID de la visión
      amount,          // Monto pagado
      priceType,       // PL_PROMO, PL, PL_UPGRADE
      paymentMethod,   // CASH o CARD
    } = body;

    logger.info(`📥 [Treasury] register-pl recibido:`, { participantId, visionId, amount, priceType, paymentMethod });

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
        plWeekend1StartDate: true,
        plWeekend3EndDate: true,
        enabledLevels: true,
      },
    });

    if (!vision) {
      return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar que la visión tenga PL habilitado
    const enabledLevels = vision.enabledLevels as string[] || [];
    if (!enabledLevels.includes('PL')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Esta visión no tiene habilitado el nivel Programa de Liderato' 
      }, { status: 400 });
    }

    // Buscar enrollment existente del participante para obtener coordinatorId
    const existingEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participantId,
        visionId: visionId,
      },
      select: { coordinatorId: true, level: true },
      orderBy: { enrolledAt: 'desc' },
    });

    // Si no hay enrollment, buscar un coordinador de la visión
    let coordinatorId = existingEnrollment?.coordinatorId;
    if (!coordinatorId) {
      const visionCoordinator = await prisma.vision_enrollments.findFirst({
        where: { visionId: visionId },
        select: { coordinatorId: true },
      });
      coordinatorId = visionCoordinator?.coordinatorId || currentUser.id;
    }

    // Verificar si ya tiene PL en esta visión
    const existingPL = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participantId,
        visionId: visionId,
        level: 'PL',
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'RESERVED'] },
      },
    });

    // Verificar si tiene ADVANCED (necesario para upgrade)
    const existingAdvanced = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participantId,
        visionId: visionId,
        level: 'ADVANCED',
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
      },
    });

    // Precios de referencia
    const plPromoPrice = 5500;
    const plBasePrice = 11000;
    const comboPrice = 14500;
    const advancedPrice = 7500;
    const upgradePrice = comboPrice - advancedPrice; // $7,000

    // Variables para el resultado
    let plEnrollment: any = null;
    let plTicket: any = null;
    let isUpgrade = false;
    let ticketsCreated = 0;

    // Buscar si ya tiene enrollment PL PENDIENTE de pago (para liquidar deuda)
    const existingPLPending = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participantId,
        visionId: visionId,
        level: 'PL',
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
    });

    // Buscar ticket PL pendiente
    const existingPLTicketPending = await prisma.ticket.findFirst({
      where: {
        ownerId: participantId,
        visionId: visionId,
        level: 'PL',
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
    });

    // Ejecutar en transacción
    const result = await prisma.$transaction(async (tx) => {
      switch (priceType) {
        case 'PL_PROMO':
        case 'PL':
          // CASO 1: Ya tiene enrollment/ticket PL pendiente → liquidar deuda
          if (existingPLPending || existingPLTicketPending) {
            logger.info(`🔄 [Treasury] Liquidando deuda PL existente para ${participant.nombre}`);
            
            // Actualizar enrollment existente a PAID
            if (existingPLPending) {
              plEnrollment = await tx.vision_enrollments.update({
                where: { id: existingPLPending.id },
                data: {
                  enrollmentStatus: 'ACTIVE',
                  paymentStatus: 'PAID',
                  updatedAt: new Date(),
                },
              });
            }

            // Actualizar ticket existente a PAID
            if (existingPLTicketPending) {
              plTicket = await tx.ticket.update({
                where: { id: existingPLTicketPending.id },
                data: {
                  status: 'ACTIVE',
                  paymentStatus: 'PAID',
                  amountPaid: parseFloat(amount),
                  updatedAt: new Date(),
                },
              });
            }

            ticketsCreated = 0; // No se creó nuevo, se actualizó existente
            logger.info(`✅ [Treasury] Deuda PL liquidada para ${participant.nombre} en ${vision.nombre}`);
            break;
          }

          // CASO 2: Ya tiene PL activo y pagado → Error
          if (existingPL) {
            throw new Error('El participante ya tiene inscripción activa en Programa de Liderato para esta visión');
          }

          // CASO 3: No tiene PL → Crear nuevo
          // Crear enrollment PL
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

          // Crear ticket PL
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
              costAtPurchase: parseFloat(amount),
              amountPaid: parseFloat(amount),
              isTransferable: false,
              validUntil: vision.plWeekend3EndDate,
              updatedAt: new Date(),
            },
          });

          ticketsCreated = 1;
          logger.info(`✅ [Treasury] PL creado para ${participant.nombre} en ${vision.nombre}`);
          break;

        case 'PL_UPGRADE':
          // Upgrade: Ya pagó Avanzado ($7,500), paga $7,000 más para completar combo
          if (!existingAdvanced) {
            throw new Error('El participante necesita tener Avanzado activo para hacer upgrade a combo');
          }

          if (existingPL && existingPL.paymentStatus === 'PAID') {
            throw new Error('El participante ya tiene PL pagado en esta visión');
          }

          isUpgrade = true;

          // Si ya tiene enrollment PL (por apartado previo), actualizarlo
          if (existingPL) {
            plEnrollment = await tx.vision_enrollments.update({
              where: { id: existingPL.id },
              data: {
                enrollmentStatus: 'ACTIVE',
                paymentStatus: 'PAID',
                updatedAt: new Date(),
              },
            });

            // Actualizar ticket PL existente
            const existingPLTicket = await tx.ticket.findFirst({
              where: {
                ownerId: participantId,
                visionId: visionId,
                level: 'PL',
              },
            });

            if (existingPLTicket) {
              plTicket = await tx.ticket.update({
                where: { id: existingPLTicket.id },
                data: {
                  type: 'STANDARD',
                  status: 'ACTIVE',
                  paymentStatus: 'PAID',
                  amountPaid: { increment: parseFloat(amount) },
                  updatedAt: new Date(),
                },
              });
            } else {
              // Crear ticket PL nuevo
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
                  costAtPurchase: upgradePrice,
                  amountPaid: parseFloat(amount),
                  isTransferable: false,
                  validUntil: vision.plWeekend3EndDate,
                  updatedAt: new Date(),
                },
              });
            }
          } else {
            // Crear enrollment PL nuevo
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

            // Crear ticket PL
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
                costAtPurchase: upgradePrice,
                amountPaid: parseFloat(amount),
                isTransferable: false,
                validUntil: vision.plWeekend3EndDate,
                updatedAt: new Date(),
              },
            });
          }

          ticketsCreated = 1;
          logger.info(`✅ [Treasury] Upgrade a PL completado para ${participant.nombre}`);
          break;

        default:
          throw new Error(`Tipo de precio no reconocido: ${priceType}`);
      }

      // Crear PaymentCode como REDEEMED
      const paymentCodeId = crypto.randomUUID();
      let codePrefix = 'PL';
      if (isUpgrade) codePrefix = 'PL-UPGRADE';
      
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const paymentCodeValue = `${codePrefix}-${timestamp}-${randomSuffix}`;

      let referenceText = `Programa de Liderato - ${participant.nombre}`;
      if (isUpgrade) {
        referenceText = `Upgrade Combo (PL) - ${participant.nombre}`;
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
          redeemedById: participantId,
          redeemedAt: new Date(),
          createdById: currentUser.id,
          createdAt: new Date(),
        },
      });

      logger.info(`✅ [Treasury] PaymentCode creado: ${paymentCodeValue}`);

      return {
        enrollment: plEnrollment,
        ticket: plTicket,
        paymentCode,
        ticketsCreated,
        isUpgrade,
      };
    });

    return NextResponse.json({
      success: true,
      message: isUpgrade 
        ? `¡Upgrade a combo completado para ${participant.nombre}!`
        : `¡${participant.nombre} inscrito en Programa de Liderato!`,
      enrollment: {
        id: result.enrollment?.id,
        level: 'PL',
        status: result.enrollment?.enrollmentStatus,
        visionName: vision.nombre,
      },
      ticket: {
        id: result.ticket?.id,
        level: 'PL',
        status: result.ticket?.status,
        amountPaid: result.ticket?.amountPaid,
      },
      paymentCode: {
        id: result.paymentCode.id,
        code: result.paymentCode.code,
        amount: result.paymentCode.amount,
        reference: result.paymentCode.reference,
        status: result.paymentCode.status,
      },
      ticketsCreated: result.ticketsCreated,
      isUpgrade: result.isUpgrade,
    });

  } catch (error: any) {
    logger.error(`❌ [Treasury] Error en register-pl:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
