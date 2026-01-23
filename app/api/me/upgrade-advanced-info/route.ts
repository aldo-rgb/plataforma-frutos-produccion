import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get visions with upcoming ADVANCED dates for each organization
    const orgsWithVisions = await Promise.all(
      organizations.map(async (org) => {
        const nextVision = await prisma.vision.findFirst({
          where: {
            organizationId: org.id,
            isActive: true,
            advancedStartDate: { gte: now },
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
    defaultPrices.forEach((p) => {
      priceMap[p.levelType] = p.promoPrice ?? p.basePrice;
      basePriceMap[p.levelType] = p.basePrice;
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
    const apartadoTicketPL = await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        level: 'PL',
        status: { in: ['PENDING_PAYMENT', 'RESERVED'] },
        paymentStatus: { in: ['PARTIAL', 'PENDING'] },
      },
      select: {
        id: true,
        costAtPurchase: true,
        amountPaid: true,
      },
    });
    
    // Determinar si tiene crédito y cuánto
    const hasApartadoCredit = !!apartadoTicketAdvanced || (!!apartadoTicketPL && Number(apartadoTicketPL.amountPaid || 0) > 0);
    
    // Calcular el saldo a favor
    let apartadoSaldo = 0;
    if (apartadoTicketAdvanced) {
      // Si tiene COMBO_PARTIAL, el saldo es el precio promo de PL
      apartadoSaldo = plPromoPrice;
    } else if (apartadoTicketPL && Number(apartadoTicketPL.amountPaid || 0) > 0) {
      // Si tiene ticket de PL con pago parcial, el saldo es lo que ya pagó
      apartadoSaldo = Number(apartadoTicketPL.amountPaid);
    }

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

    // Fecha límite de promoción: 8 PM del último día del básico
    let promoDeadlineDate: string | null = null;
    if (currentVision?.basicEndDate) {
      const basicEnd = currentVision.basicEndDate instanceof Date 
        ? currentVision.basicEndDate 
        : new Date(currentVision.basicEndDate);
      
      // Crear fecha con hora 20:00 (8 PM) del último día del básico
      const promoDeadline = new Date(basicEnd);
      promoDeadline.setHours(20, 0, 0, 0); // 8 PM
      promoDeadlineDate = promoDeadline.toISOString();
    }

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
      prices: {
        ADVANCED: advancedPromoPrice,        // Precio promo avanzado solo
        ADVANCED_BASE: advancedBasePrice,    // Precio base avanzado
        PL: plPromoPrice,                    // Precio promo PL
        PL_BASE: plBasePrice,                // Precio base PL  
        COMBO: comboPrice,                   // Precio del combo promo
        COMBO_BASE: comboBasePrice,          // Precio base combo (para tachar)
        APARTADO_SALDO: apartadoSaldo,       // Crédito a favor si pagó apartado
      },
    });
  } catch (error) {
    console.error('Error fetching upgrade info:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
