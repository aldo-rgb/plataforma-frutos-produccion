import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get user's current vision enrollment (BASIC)
    const currentEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        level: 'BASIC',
        enrollmentStatus: { in: ['ACTIVE', 'ENROLLED'] },
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

    if (!currentEnrollment) {
      return NextResponse.json(
        { success: false, error: 'No tienes un entrenamiento Básico activo' },
        { status: 400 }
      );
    }

    // Check if already enrolled in ADVANCED
    const existingAdvanced = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        level: 'ADVANCED',
        enrollmentStatus: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (existingAdvanced) {
      return NextResponse.json(
        { success: false, error: 'Ya estás inscrito en el entrenamiento Avanzado' },
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
    const now = new Date();
    
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
    const advancedBasePrice = basePriceMap['ADVANCED'] || 9000; // Costo base avanzado
    const plBasePrice = basePriceMap['PL'] || 11000;           // Costo base PL
    
    // Combo Avanzado + PL - usar precio configurado de COMBO si existe, sino calcular
    const comboConfigured = priceMap['COMBO'] || basePriceMap['COMBO'];
    const comboPrice = comboConfigured || (advancedBasePrice + plPromoPrice); // Precio del combo
    const comboBasePrice = advancedBasePrice + plBasePrice; // Suma de precios base (tachado)
    
    // Apartado: paga el costo base del avanzado, queda debiendo el promo del PL
    const apartadoPrice = advancedBasePrice;

    return NextResponse.json({
      success: true,
      currentVision,
      availableOrganizations: orgsWithVisions.filter(o => o.nextAdvancedVision !== null || o.id === currentVision?.organizationId),
      prices: {
        ADVANCED: advancedPromoPrice,        // Precio promo avanzado solo
        ADVANCED_BASE: advancedBasePrice,    // Precio base avanzado
        PL: plPromoPrice,                    // Precio promo PL
        PL_BASE: plBasePrice,                // Precio base PL  
        COMBO: comboPrice,                   // Precio del combo
        COMBO_BASE: comboBasePrice,          // Suma de bases (para tachar)
        APARTADO: apartadoPrice,             // Lo que paga hoy en apartado
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
