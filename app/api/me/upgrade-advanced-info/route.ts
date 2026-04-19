import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Tipo de panorama del usuario
type UserPanorama = 'BASICO_EN_CURSO' | 'BASICO_COMPLETADO' | 'AVANZADO_EN_CURSO' | 'YA_INSCRITO_PL' | 'NO_INSCRITO';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Obtener TODAS las inscripciones del usuario para determinar su estado
    const allEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId: userId,
        enrollmentStatus: { in: ['ACTIVE', 'ENROLLED', 'PENDING'] },
      },
      include: {
        Vision: {
          include: {
            Organization: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    // Separar inscripciones por nivel
    const basicEnrollment = allEnrollments.find(e => e.level === 'BASIC');
    const advancedEnrollment = allEnrollments.find(e => e.level === 'ADVANCED');
    const plEnrollment = allEnrollments.find(e => e.level === 'PL');

    // Fecha actual para comparar
    const now = new Date();

    // Verificar si el PL está realmente pagado o solo es un apartado/reserva
    let plIsPaidComplete = false;
    let plTicketInfo = null;
    
    if (plEnrollment) {
      // Buscar el ticket de PL para verificar su estado de pago
      const plTicket = await prisma.ticket.findFirst({
        where: {
          ownerId: userId,
          level: 'PL',
          visionId: plEnrollment.visionId,
        },
        select: {
          id: true,
          status: true,
          type: true,
          amountPaid: true,
          costAtPurchase: true,
          paymentStatus: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      if (plTicket) {
        plTicketInfo = plTicket;
        // El PL está pagado completo si:
        // - status es ACTIVE y paymentStatus es PAID o GIFT
        // - O amountPaid >= costAtPurchase
        const isPaid = 
          (plTicket.status === 'ACTIVE' && ['PAID', 'GIFT'].includes(plTicket.paymentStatus as string)) ||
          (Number(plTicket.amountPaid) >= Number(plTicket.costAtPurchase || 0) && Number(plTicket.costAtPurchase) > 0);
        
        plIsPaidComplete = isPaid;
      }
    }

    // Determinar el panorama del usuario basándose en el trainingStatus del SchoolProduct
    let panorama: UserPanorama = 'NO_INSCRITO';
    
    if (plEnrollment && plIsPaidComplete) {
      // Si ya tiene PL PAGADO COMPLETO, ya está completamente inscrito
      panorama = 'YA_INSCRITO_PL';
    } else if (plEnrollment && !plIsPaidComplete) {
      // Tiene enrollment de PL pero NO está pagado completo (es apartado/reserva)
      // Debe poder pagar - tratarlo como AVANZADO_EN_CURSO para que pueda acceder a pago PL
      panorama = 'AVANZADO_EN_CURSO';
    } else if (advancedEnrollment) {
      // Si tiene ADVANCED pero no PL, está en avanzado en curso
      panorama = 'AVANZADO_EN_CURSO';
    } else if (basicEnrollment) {
      // Solo tiene básico - verificar si tiene DROP
      const basicAttendance = basicEnrollment.attendanceStatus;
      
      if (basicAttendance === 'DROP') {
        return NextResponse.json(
          { success: false, error: 'Tu participación en el programa ha sido pausada. Contacta a tu coordinador.' },
          { status: 403 }
        );
      }
      
      // Buscar el SchoolProduct del nivel BASIC para esta visión
      // El trainingStatus indica si el TRAINER ya finalizó el entrenamiento
      const basicProduct = basicEnrollment.visionId ? await prisma.schoolProduct.findFirst({
        where: {
          visionId: basicEnrollment.visionId,
          levelType: 'BASIC',
          isActive: true,
        },
        select: {
          trainingStatus: true,
          finishedAt: true,
        },
      }) : null;
      
      // Si el entrenamiento está COMPLETED (el TRAINER lo finalizó), mostrar BASICO_COMPLETADO
      // De lo contrario, mostrar BASICO_EN_CURSO
      if (basicProduct?.trainingStatus === 'COMPLETED') {
        panorama = 'BASICO_COMPLETADO';
      } else {
        // El entrenamiento está PENDING o IN_PROGRESS
        panorama = 'BASICO_EN_CURSO';
      }
    }

    if (panorama === 'NO_INSCRITO') {
      return NextResponse.json(
        { success: false, error: 'No tienes un entrenamiento activo' },
        { status: 400 }
      );
    }

    if (panorama === 'YA_INSCRITO_PL') {
      return NextResponse.json({
        success: true,
        panorama: 'YA_INSCRITO_PL',
        message: 'Ya estás inscrito en todos los niveles',
      });
    }

    // El enrollment actual depende del panorama
    const currentEnrollment = panorama === 'AVANZADO_EN_CURSO' ? advancedEnrollment : basicEnrollment;

    if (!currentEnrollment?.Vision) {
      return NextResponse.json(
        { success: false, error: 'No se encontró información de la visión' },
        { status: 400 }
      );
    }

    // Get current vision info
    const currentVision = currentEnrollment.Vision ? {
      id: currentEnrollment.Vision.id,
      nombre: currentEnrollment.Vision.nombre,
      organizationId: currentEnrollment.Vision.organizationId,
      organizationName: currentEnrollment.Vision.Organization?.name || 'Organización',
      advancedStartDate: currentEnrollment.Vision.advancedStartDate,
      advancedEndDate: currentEnrollment.Vision.advancedEndDate,
      // Fecha de fin del entrenamiento básico para calcular promo
      basicEndDate: currentEnrollment.Vision.endDate,
      basicStartDate: currentEnrollment.Vision.startDate,
    } : null;

    // Get all organizations with upcoming ADVANCED events
    // (now ya está definido arriba)
    
    // First, get the master organization
    const masterOrg = await prisma.masterOrganization.findFirst({
      select: { id: true },
    });

    // Get the current organization ID (could be null)
    const currentOrgId = currentEnrollment.Vision?.organizationId;

    // Build where conditions
    const orgWhereConditions: any[] = [];
    if (masterOrg?.id) {
      orgWhereConditions.push({ masterOrganizationId: masterOrg.id });
    }
    if (currentOrgId) {
      orgWhereConditions.push({ id: currentOrgId });
    }

    // Get organizations linked to this master org
    const organizations = await prisma.organization.findMany({
      where: orgWhereConditions.length > 0 
        ? { OR: orgWhereConditions } 
        : {},
      select: {
        id: true,
        name: true,
        logoUrl: true,
      },
    });

    // Get visions with ADVANCED dates (upcoming or currently in progress)
    // Allow enrollment if advancedEndDate hasn't passed yet
    const orgsWithVisions = await Promise.all(
      organizations.map(async (org) => {
        const nextVision = await prisma.vision.findFirst({
          where: {
            organizationId: org.id,
            isActive: true,
            // Changed: Allow enrollment if ADVANCED hasn't ended yet (not just future ones)
            advancedEndDate: { gte: now },
            enabledLevels: { has: 'ADVANCED' },
          },
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
            advancedEndDate: true,
            maxParticipantes: true,
            _count: {
              select: {
                vision_enrollments: {
                  where: {
                    level: 'ADVANCED',
                    enrollmentStatus: { in: ['ACTIVE', 'PENDING'] },
                  },
                },
              },
            },
          },
          orderBy: {
            advancedStartDate: 'asc',
          },
        });

        return {
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          nextAdvancedVision: nextVision ? {
            id: nextVision.id,
            nombre: nextVision.nombre,
            startDate: nextVision.advancedStartDate?.toISOString() || '',
            endDate: nextVision.advancedEndDate?.toISOString() || '',
            availableSpots: Math.max(0, (nextVision.maxParticipantes || 100) - nextVision._count.vision_enrollments),
          } : null,
        };
      })
    );

    // Get prices for the user's organization
    const orgId = currentEnrollment.Vision?.organizationId;
    const defaultPrices = orgId ? await prisma.defaultPrice.findMany({
      where: {
        organizationId: orgId,
      },
    }) : [];

    const priceMap: Record<string, number> = {};
    const basePriceMap: Record<string, number> = {};
    // Para guardar pago1 y pago2 del combo
    let comboPago1: number | null = null;
    let comboPago2: number | null = null;
    
    defaultPrices.forEach((p) => {
      priceMap[p.levelType] = p.promoPrice ?? p.basePrice;
      basePriceMap[p.levelType] = p.basePrice;
      
      // Extraer pago1 y pago2 del COMBO_ADV_PL
      if (p.levelType === 'COMBO_ADV_PL') {
        comboPago1 = p.pago1 ? Number(p.pago1) : null;
        comboPago2 = p.pago2 ? Number(p.pago2) : null;
      }
    });
    
    // DEBUG: Log price maps
    console.log('🔍 DEBUG upgrade-advanced-info prices:', {
      orgId,
      defaultPricesCount: defaultPrices.length,
      priceMap,
      basePriceMap,
      comboPago1,
      comboPago2,
    });

    // Precios individuales
    const advancedPromoPrice = priceMap['ADVANCED'] || 7500;  // Precio promo del avanzado
    const plPromoPrice = priceMap['PL'] || 5500;              // Precio promo del PL
    const advancedBasePrice = basePriceMap['ADVANCED'] || 9500; // Costo base avanzado
    const plBasePrice = basePriceMap['PL'] || 11000;           // Costo base PL
    
    // Combo Avanzado + PL
    // COMBO promo = precio configurado o $9,000 por defecto
    // COMBO base = precio configurado o $14,500 por defecto
    const comboPromoConfigured = priceMap['COMBO_ADV_PL'];
    const comboPrice = comboPromoConfigured || 9000;
    
    const comboBaseConfigured = basePriceMap['COMBO_ADV_PL'];
    const comboBasePrice = comboBaseConfigured || 14500;
    
    // Verificar si el usuario tiene crédito de apartado
    // OPCIÓN 1: Ticket ADVANCED con tipo COMBO_PARTIAL
    const apartadoTicketAdvanced = await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        level: 'ADVANCED',
        paymentStatus: { in: ['PAID', 'PARTIAL'] },
        type: 'COMBO_PARTIAL',
      },
      select: {
        id: true,
        purchasePrice: true,
        amountPaid: true,
      },
    });
    
    // OPCIÓN 2: Ticket de PL con pago parcial (amountPaid > 0)
    // IMPORTANTE: Solo considerar tickets de la visión actual
    const apartadoTicketPL = currentVision ? await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        visionId: currentVision.id, // Solo de la visión actual
        level: 'PL',
        status: { in: ['PENDING_PAYMENT', 'RESERVED'] },
        paymentStatus: { in: ['PARTIAL', 'PENDING'] },
      },
      select: {
        id: true,
        costAtPurchase: true,
        amountPaid: true,
      },
    }) : null;
    
    // OPCIÓN 3: Ticket ADVANCED donde pagó más del costo (exceso va como crédito)
    // Esto cubre casos donde el usuario pagó por combo pero se registró como ADVANCED
    // IMPORTANTE: Solo considerar sobrepago de la VISIÓN ACTUAL para evitar créditos de otras visiones
    const advancedTicketWithOverpayment = currentVision ? await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        visionId: currentVision.id, // Solo de la visión actual
        level: 'ADVANCED',
        status: 'ACTIVE',
        paymentStatus: 'PAID',
      },
      select: {
        id: true,
        costAtPurchase: true,
        amountPaid: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) : null;
    
    // Calcular si hay sobrepago en el ticket ADVANCED
    let overpaymentCredit = 0;
    if (advancedTicketWithOverpayment) {
      const cost = Number(advancedTicketWithOverpayment.costAtPurchase || 0);
      const paid = Number(advancedTicketWithOverpayment.amountPaid || 0);
      if (paid > cost && cost > 0) {
        overpaymentCredit = paid - cost;
      }
    }
    
    // Determinar si tiene crédito y cuánto
    const hasApartadoCredit = !!apartadoTicketAdvanced || 
      (!!apartadoTicketPL && Number(apartadoTicketPL.amountPaid || 0) > 0) ||
      overpaymentCredit > 0;
    
    // Calcular el saldo a favor
    let apartadoSaldo = 0;
    if (apartadoTicketAdvanced) {
      // Si tiene COMBO_PARTIAL, el saldo es el precio promo de PL
      apartadoSaldo = plPromoPrice;
    } else if (apartadoTicketPL && Number(apartadoTicketPL.amountPaid || 0) > 0) {
      // Si tiene ticket de PL con pago parcial, el saldo es lo que ya pagó
      apartadoSaldo = Number(apartadoTicketPL.amountPaid);
    } else if (overpaymentCredit > 0) {
      // Si pagó de más en ADVANCED, usar ese exceso como crédito
      apartadoSaldo = overpaymentCredit;
    }
    
    // Precio de PL para mostrar:
    // Durante el avanzado (panorama AVANZADO_EN_CURSO), SIEMPRE usar precio del combo ($9,000)
    // porque es la promo de "inscríbete durante tu avanzado"
    // Después del avanzado, usar el precio individual del PL
    const plDisplayPromoPrice = panorama === 'AVANZADO_EN_CURSO' ? comboPrice : plPromoPrice;

    // Obtener próxima visión de PL (para Panorama 3)
    // Nota: PL usa plWeekend1StartDate como fecha de inicio
    const nextPLVision = orgId ? await prisma.vision.findFirst({
      where: {
        organizationId: orgId,
        isActive: true,
        plWeekend1StartDate: { gte: now },
        enabledLevels: { has: 'PL' },
      },
      select: {
        id: true,
        nombre: true,
        plWeekend1StartDate: true,
        plWeekend3EndDate: true,
      },
      orderBy: {
        plWeekend1StartDate: 'asc',
      },
    }) : null;

    // Fecha límite de promoción: 11 PM del último día del avanzado
    let promoDeadlineDate: string | null = null;
    if (currentVision?.advancedEndDate) {
      const advancedEnd = currentVision.advancedEndDate instanceof Date 
        ? currentVision.advancedEndDate 
        : new Date(currentVision.advancedEndDate);
      
      // Crear fecha con hora 23:00 (11 PM) del último día del avanzado
      const promoDeadline = new Date(advancedEnd);
      promoDeadline.setHours(23, 0, 0, 0); // 11 PM
      promoDeadlineDate = promoDeadline.toISOString();
    }
    
    // Calcular cuánto ha pagado el usuario realmente por ADVANCED
    // Esto se usa para mostrar "Ya pagaste: $X"
    let advancedAmountPaid = advancedPromoPrice; // Default al precio promo
    if (advancedTicketWithOverpayment) {
      advancedAmountPaid = Number(advancedTicketWithOverpayment.amountPaid || 0);
    }
    
    // DEBUG: Log final prices being returned
    const finalPrices = {
      ADVANCED: advancedPromoPrice,        
      ADVANCED_BASE: advancedBasePrice,    
      ADVANCED_PAID: advancedAmountPaid,   
      PL: plDisplayPromoPrice,             
      PL_BASE: plBasePrice,                  
      COMBO: comboPrice,                   
      COMBO_BASE: comboBasePrice,          
      APARTADO_SALDO: apartadoSaldo,
      // Pago en 2 partes - si está configurado
      APARTADO_PAGO1: comboPago1,  // 1er pago (hoy)
      APARTADO_PAGO2: comboPago2,  // 2do pago (después)
    };
    console.log('🔍 DEBUG final prices:', {
      panorama,
      finalPrices,
      comboPromoConfigured,
      comboBaseConfigured,
      comboPago1,
      comboPago2,
    });

    return NextResponse.json({
      success: true,
      panorama,
      currentVision,
      availableOrganizations: orgsWithVisions.filter(o => o.nextAdvancedVision !== null || o.id === currentVision?.organizationId),
      nextPLVision: nextPLVision ? {
        id: nextPLVision.id,
        name: nextPLVision.nombre,
        startDate: nextPLVision.plWeekend1StartDate?.toISOString(),
        endDate: nextPLVision.plWeekend3EndDate?.toISOString(),
      } : null,
      promoDeadline: promoDeadlineDate,
      hasApartadoCredit,
      prices: finalPrices,
    });
  } catch (error) {
    logger.error('Error fetching upgrade info:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
