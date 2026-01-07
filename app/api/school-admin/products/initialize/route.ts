import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Inicializar productos CORE para una organización
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No perteneces a ninguna organización' },
        { status: 400 }
      );
    }

    // Obtener datos de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        premiumLicensePrice: true,
        standardLicensePrice: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Calcular precios basados en la configuración de la organización
    const basicoPrice = organization.standardLicensePrice || 6500;
    const avanzadoPrice = organization.premiumLicensePrice || 7500;
    const plPrice = 12000; // Precio fijo para PL
    const comboCompleto = basicoPrice + avanzadoPrice + plPrice;
    const comboAvanzadoPL = avanzadoPrice + plPrice;

    // Verificar si ya existen productos CORE
    const existingCore = await prisma.schoolProduct.findFirst({
      where: {
        organizationId: user.organizationId,
        type: 'CORE_TRAINING',
      },
    });

    if (existingCore) {
      return NextResponse.json(
        { success: false, error: 'Los productos CORE ya están inicializados' },
        { status: 400 }
      );
    }

    // Crear los 5 productos CORE (3 individuales + 2 combos)
    const coreProducts = await prisma.$transaction([
      // Básico
      prisma.schoolProduct.create({
        data: {
          organizationId: user.organizationId,
          name: 'Entrenamiento Básico',
          description: 'Programa de entrenamiento básico de 6 meses',
          type: 'CORE_TRAINING',
          levelType: 'BASIC',
          basePrice: basicoPrice,
          promoPrice: null,
          promoDeadline: null,
          createdBy: session.user.id,
          updatedAt: new Date(),
        },
      }),
      // Avanzado
      prisma.schoolProduct.create({
        data: {
          organizationId: user.organizationId,
          name: 'Entrenamiento Avanzado',
          description: 'Programa de entrenamiento avanzado de 6 meses',
          type: 'CORE_TRAINING',
          levelType: 'ADVANCED',
          basePrice: avanzadoPrice,
          promoPrice: null,
          promoDeadline: null,
          createdBy: session.user.id,
          updatedAt: new Date(),
        },
      }),
      // Programa de Liderato
      prisma.schoolProduct.create({
        data: {
          organizationId: user.organizationId,
          name: 'Programa de Liderato',
          description: 'Programa intensivo de liderazgo',
          type: 'CORE_TRAINING',
          levelType: 'PL',
          basePrice: plPrice,
          promoPrice: null,
          promoDeadline: null,
          createdBy: session.user.id,
          updatedAt: new Date(),
        },
      }),
      // Combo: Básico + Avanzado + PL
      prisma.schoolProduct.create({
        data: {
          organizationId: user.organizationId,
          name: 'Combo: Básico + Avanzado + PL',
          description: 'Paquete completo de transformación (18 meses)',
          type: 'CORE_TRAINING',
          levelType: 'NONE',
          basePrice: comboCompleto,
          promoPrice: null,
          promoDeadline: null,
          createdBy: session.user.id,
          updatedAt: new Date(),
        },
      }),
      // Combo: Avanzado + PL
      prisma.schoolProduct.create({
        data: {
          organizationId: user.organizationId,
          name: 'Combo: Avanzado + PL',
          description: 'Paquete avanzado de liderazgo (12 meses)',
          type: 'CORE_TRAINING',
          levelType: 'NONE',
          basePrice: comboAvanzadoPL,
          promoPrice: null,
          promoDeadline: null,
          createdBy: session.user.id,
          updatedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Productos CORE inicializados correctamente',
      products: coreProducts,
    });
  } catch (error) {
    console.error('Error initializing core products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al inicializar los productos CORE' },
      { status: 500 }
    );
  }
}
