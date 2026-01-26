import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const { 
      visionId, 
      organizationId, 
      paymentMethod, 
      amountPaid, 
      appliedCodes,
      packageType = 'ADVANCED_ONLY',
      pendingDebt = 0,
      prices
    } = body;

    if (!visionId || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Check if this is a PL-only purchase
    const isPLOnlyPurchase = packageType === 'PL_BASE' || packageType === 'PL_CON_CREDITO';

    // Check if already enrolled in ADVANCED for this vision
    let existingAdvancedEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        visionId: visionId,
        level: 'ADVANCED',
      },
    });

    // For PL-only purchases, if no ADVANCED in specified vision, find where user HAS ADVANCED
    let effectiveVisionId = visionId;
    if (isPLOnlyPurchase && !existingAdvancedEnrollment) {
      // Buscar en qué visión SÍ tiene ADVANCED
      const advancedEnrollmentAnyVision = await prisma.vision_enrollments.findFirst({
        where: {
          userId: userId,
          level: 'ADVANCED',
          enrollmentStatus: { in: ['ACTIVE', 'ENROLLED'] },
        },
        include: {
          Vision: {
            select: {
              id: true,
              organizationId: true,
              enabledLevels: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      if (advancedEnrollmentAnyVision && advancedEnrollmentAnyVision.Vision?.enabledLevels?.includes('PL')) {
        // Usar la visión donde tiene ADVANCED
        effectiveVisionId = advancedEnrollmentAnyVision.visionId;
        existingAdvancedEnrollment = advancedEnrollmentAnyVision;
        console.log(`🔄 PL-only: Usuario ${userId} no tiene ADVANCED en visión ${visionId}, usando visión ${effectiveVisionId} donde sí tiene ADVANCED`);
      } else {
        return NextResponse.json(
          { success: false, error: 'Debes tener una inscripción activa en Avanzado para comprar solo PL' },
          { status: 400 }
        );
      }
    }

    // For PL-only purchases, user MUST have ADVANCED enrollment (already handled above)
    if (isPLOnlyPurchase && !existingAdvancedEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Debes tener una inscripción activa en Avanzado para comprar solo PL' },
        { status: 400 }
      );
    }

    // For non-PL-only purchases, user must NOT have ADVANCED enrollment already
    if (!isPLOnlyPurchase && existingAdvancedEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Ya estás inscrito en este entrenamiento Avanzado' },
        { status: 400 }
      );
    }

    // Check if already enrolled in PL for the effective vision (may be different from requested for PL-only)
    const existingPLEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        visionId: effectiveVisionId,
        level: 'PL',
      },
    });

    // Solo bloquear si el enrollment de PL ya está PAGADO
    // Si está pendiente, permitimos que complete el pago
    const paidStatuses = ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'];
    if (existingPLEnrollment && paidStatuses.includes(existingPLEnrollment.paymentStatus || '')) {
      return NextResponse.json(
        { success: false, error: 'Ya estás inscrito en el Liderato (PL)' },
        { status: 400 }
      );
    }

    // Verify user has completed BASIC
    const basicEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        level: 'BASIC',
        enrollmentStatus: { in: ['ACTIVE', 'ENROLLED'] },
      },
    });

    if (!basicEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Debes completar el entrenamiento Básico primero' },
        { status: 400 }
      );
    }

    // Get the vision to verify it exists and has levels enabled
    // For PL-only purchases, use effectiveVisionId (where user has ADVANCED)
    const targetVisionId = isPLOnlyPurchase ? effectiveVisionId : visionId;
    
    const vision = await prisma.vision.findUnique({
      where: { id: targetVisionId },
      select: {
        id: true,
        enabledLevels: true,
        advancedStartDate: true,
        advancedEndDate: true,
        plWeekend1StartDate: true,
        plWeekend3EndDate: true, // Use last PL weekend end date
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // For non-PL-only, verify ADVANCED is enabled
    if (!isPLOnlyPurchase && !vision.enabledLevels?.includes('ADVANCED')) {
      return NextResponse.json(
        { success: false, error: 'Esta visión no tiene el nivel Avanzado habilitado' },
        { status: 400 }
      );
    }

    // For PL-only, verify PL is enabled
    if (isPLOnlyPurchase && !vision.enabledLevels?.includes('PL')) {
      return NextResponse.json(
        { success: false, error: 'Esta visión no tiene el nivel PL habilitado' },
        { status: 400 }
      );
    }

    // Determine if this is a PL-only purchase (user already has ADVANCED)
    const isPLOnly = packageType === 'PL_BASE' || packageType === 'PL_CON_CREDITO';

    // Create enrollment and tickets in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let advancedEnrollment = null;
      let advancedTicket = null;
      let plEnrollment = null;
      let plTicket = null;

      // For PL-only purchases, skip ADVANCED creation (user already has it)
      if (isPLOnly) {
        // Verify user already has ADVANCED enrollment (use effectiveVisionId)
        const existingAdvanced = await tx.vision_enrollments.findFirst({
          where: {
            userId: userId,
            visionId: effectiveVisionId,
            level: 'ADVANCED',
          },
        });

        if (!existingAdvanced) {
          throw new Error('Debes tener una inscripción activa en Avanzado para comprar solo PL');
        }

        // Check if there's an existing PENDING PL enrollment to update
        const existingPendingPL = await tx.vision_enrollments.findFirst({
          where: {
            userId: userId,
            visionId: effectiveVisionId,
            level: 'PL',
            paymentStatus: { in: ['PENDING', 'PARTIAL'] },
          },
        });

        if (existingPendingPL) {
          // Update the existing pending PL enrollment
          plEnrollment = await tx.vision_enrollments.update({
            where: { id: existingPendingPL.id },
            data: {
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'PAID',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });
          console.log(`✅ Actualizando enrollment PL pendiente (ID: ${existingPendingPL.id}) a PAID`);
        } else {
          // Create new PL enrollment in the same vision as ADVANCED
          plEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: userId,
              visionId: effectiveVisionId,
              coordinatorId: existingAdvanced.coordinatorId,
              level: 'PL',
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'PAID',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        // Create PL ticket in the same vision as ADVANCED
        plTicket = await tx.ticket.create({
          data: {
            ownerId: userId,
            organizationId: organizationId,
            visionId: effectiveVisionId,
            level: 'PL',
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            costAtPurchase: prices?.PL_BASE || amountPaid,
            amountPaid: amountPaid,
            isTransferable: false,
            validUntil: vision.plWeekend3EndDate || null,
          },
        });
      } else {
        // Original flow: Create ADVANCED enrollment and ticket
        advancedEnrollment = await tx.vision_enrollments.create({
          data: {
            userId: userId,
            visionId: visionId,
            coordinatorId: basicEnrollment.coordinatorId,
            level: 'ADVANCED',
            enrollmentStatus: 'ACTIVE',
            paymentStatus: amountPaid > 0 ? 'PAID' : 'PENDING',
            enrolledAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create ADVANCED ticket
        advancedTicket = await tx.ticket.create({
          data: {
            ownerId: userId,
            organizationId: organizationId,
            visionId: visionId,
            level: 'ADVANCED',
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            costAtPurchase: prices?.ADVANCED || amountPaid,
            amountPaid: amountPaid,
            isTransferable: false,
            validUntil: vision.advancedEndDate || null,
          },
        });

        // If COMBO, APARTADO, or ADVANCED_PROMO, also create PL enrollment and ticket
        // ADVANCED_PROMO: Creates a PL ticket with PROMO_AVAILABLE status (can pay $1,500 to reserve)
        if (packageType === 'COMBO' || packageType === 'APARTADO' || packageType === 'ADVANCED_PROMO') {
          // Determine PL enrollment status based on package type
          const plEnrollmentStatus = packageType === 'COMBO' ? 'ACTIVE' : 'PENDING';
          const plPaymentStatus = packageType === 'COMBO' ? 'PAID' : 'PENDING';
          
          // Determine PL ticket status
          let plTicketStatus = 'ACTIVE';
          let plTicketType = 'STANDARD';
          
          if (packageType === 'APARTADO') {
            plTicketStatus = 'PENDING_PAYMENT';
            plTicketType = 'APARTADO';
          } else if (packageType === 'ADVANCED_PROMO') {
            plTicketStatus = 'PROMO_AVAILABLE'; // Special status: user can pay $1,500 to reserve promo
            plTicketType = 'PROMO_RESERVABLE';
          }
          
          // Calculate PL cost based on package type
          // COMBO: precio incluido en combo
          // APARTADO: precio promo $5,500 (modelo antiguo)
          // ADVANCED_PROMO: precio promo durante avanzado $9,000, puede reservar con $1,500
          let plCost = prices?.PL_BASE || 11000;
          let plAmountPaid = 0;
          
          if (packageType === 'COMBO') {
            plCost = prices?.PL || 5500;
            plAmountPaid = plCost;
          } else if (packageType === 'APARTADO') {
            plCost = prices?.PL || 5500; // Promo price for apartado (modelo antiguo)
          } else if (packageType === 'ADVANCED_PROMO') {
            // Precio promo durante avanzado: $9,000
            // Este es el precio que pagará si reserva con $1,500 durante básico
            plCost = 9000; // Precio promo fijo durante avanzado
          }
          
          // Create PL enrollment
          plEnrollment = await tx.vision_enrollments.create({
            data: {
              userId: userId,
              visionId: visionId,
              coordinatorId: basicEnrollment.coordinatorId,
              level: 'PL',
              enrollmentStatus: plEnrollmentStatus,
              paymentStatus: plPaymentStatus,
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Calculate deadlines based on package type
          // ADVANCED_PROMO: Deposit deadline is 11 PM of last day of BASIC training
          // Payment deadline (for promo price) is 11 PM of last day of ADVANCED training
          let depositDeadline: Date | null = null;
          let promoDeadline: Date | null = null;
          
          if (packageType === 'ADVANCED_PROMO') {
            // Deposit deadline: 11 PM of last day of BASIC (before advanced starts)
            if (vision.advancedStartDate) {
              depositDeadline = new Date(vision.advancedStartDate);
              depositDeadline.setDate(depositDeadline.getDate() - 1);
              depositDeadline.setHours(23, 0, 0, 0); // 11 PM
            }
            
            // Promo payment deadline: 11 PM of last day of ADVANCED
            if (vision.advancedEndDate) {
              promoDeadline = new Date(vision.advancedEndDate);
              promoDeadline.setHours(23, 0, 0, 0); // 11 PM
            }
          } else {
            // For other package types, use PL end date
            promoDeadline = vision.plWeekend3EndDate ? new Date(vision.plWeekend3EndDate) : null;
          }

          // Create PL ticket
          plTicket = await tx.ticket.create({
            data: {
              ownerId: userId,
              organizationId: organizationId,
              visionId: visionId,
              level: 'PL',
              type: plTicketType,
              status: plTicketStatus,
              paymentStatus: plPaymentStatus,
              costAtPurchase: plCost,
              amountPaid: plAmountPaid,
              isTransferable: false,
              // For PROMO_RESERVABLE: validUntil = deposit deadline (11 PM last day of basic)
              // After deposit, it will be updated to promo payment deadline
              validUntil: packageType === 'ADVANCED_PROMO' ? depositDeadline : promoDeadline,
            },
          });
        }
      }

      // Update user's currentVisionLevel
      const user = await tx.usuario.findUnique({
        where: { id: userId },
        select: { currentVisionLevel: true },
      });

      const levelHierarchy = ['BASIC', 'ADVANCED', 'PL'];
      const currentLevelIndex = levelHierarchy.indexOf(user?.currentVisionLevel || 'BASIC');
      const targetLevel = (packageType === 'COMBO' || isPLOnly) ? 'PL' : 'ADVANCED';
      const newLevelIndex = levelHierarchy.indexOf(targetLevel);

      if (newLevelIndex > currentLevelIndex) {
        await tx.usuario.update({
          where: { id: userId },
          data: {
            currentVisionLevel: targetLevel,
          },
        });
      }

      // If organization changed, update user's organization
      const currentUser = await tx.usuario.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });

      if (currentUser?.organizationId !== organizationId) {
        await tx.usuario.update({
          where: { id: userId },
          data: {
            organizationId: organizationId,
          },
        });
      }

      return {
        advancedEnrollment,
        advancedTicket,
        plEnrollment,
        plTicket,
        packageType,
        isPLOnly,
      };
    });

    // Build response message based on package type
    let message = '¡Inscripción exitosa al entrenamiento Avanzado!';
    if (packageType === 'COMBO') {
      message = '¡Inscripción exitosa al Combo Avanzado + Liderato!';
    } else if (packageType === 'APARTADO') {
      message = '¡Tu lugar en Liderato ha sido apartado! Recuerda pagar antes del inicio del Avanzado.';
    } else if (packageType === 'PL_BASE' || packageType === 'PL_CON_CREDITO') {
      message = '¡Inscripción exitosa al Liderato (PL)!';
    }

    // For PL-only, return the PL enrollment info
    const enrollmentToReturn = result.isPLOnly ? result.plEnrollment : result.advancedEnrollment;

    return NextResponse.json({
      success: true,
      message,
      enrollment: enrollmentToReturn ? {
        id: enrollmentToReturn.id,
        level: enrollmentToReturn.level,
        status: enrollmentToReturn.enrollmentStatus,
        packageType: packageType,
      } : null,
      tickets: {
        advanced: result.advancedTicket ? { id: result.advancedTicket.id, status: result.advancedTicket.status } : null,
        pl: result.plTicket ? { id: result.plTicket.id, status: result.plTicket.status, paymentStatus: result.plTicket.paymentStatus } : null,
      },
    });
  } catch (error: any) {
    console.error('Error enrolling in advanced:', error);
    
    // Return specific error message if it's a known validation error
    const errorMessage = error?.message || 'Error interno del servidor';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
