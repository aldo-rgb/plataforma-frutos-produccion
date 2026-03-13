import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/me/organization-products
 * Obtiene los entrenamientos/productos activos de la organización del usuario
 * Diseñado para usuarios graduados que pueden ver los próximos entrenamientos
 */
export async function GET() {
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
        organizationId: true,
        isGraduated: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({
        success: true,
        products: [],
        message: 'Usuario sin organización asignada'
      });
    }

    // Obtener productos de la organización que están activos y próximos
    const products = await prisma.schoolProduct.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
        // Excluir productos ya finalizados
        OR: [
          { endDate: { gte: new Date() } },
          { endDate: null }
        ]
      },
      include: {
        Organization: {
          select: {
            name: true,
            logoUrl: true,
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
          }
        }
      },
      orderBy: [
        { startDate: 'asc' },
        { levelType: 'asc' },
      ],
      take: 10, // Máximo 10 productos para el carrusel
    });

    // Formatear los productos para el frontend
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      levelType: product.levelType,
      type: product.type,
      trainingStatus: product.trainingStatus,
      startDate: product.startDate,
      endDate: product.endDate,
      registrationOpenDate: product.registrationOpenDate,
      basePrice: product.basePrice,
      promoPrice: product.promoPrice,
      promoDeadline: product.promoDeadline,
      maxCapacity: product.maxCapacity,
      currentEnrollment: product.currentEnrollment,
      availableSpots: product.maxCapacity ? product.maxCapacity - (product.currentEnrollment || 0) : null,
      imageUrl: product.imageUrl,
      location: product.location,
      organizationName: product.Organization?.name,
      organizationLogo: product.Organization?.logoUrl,
      visionId: product.Vision?.id,
      visionName: product.Vision?.nombre,
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      isGraduated: user.isGraduated,
    });
  } catch (error) {
    console.error('Error fetching organization products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los productos' },
      { status: 500 }
    );
  }
}
