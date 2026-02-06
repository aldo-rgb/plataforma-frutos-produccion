import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const visionId = searchParams.get('visionId');

    // Construir filtro
    const where: any = {
      status: { in: ['HIDDEN', 'ACTIVE'] }
    };

    if (organizationId) {
      where.organizationId = parseInt(organizationId);
    }

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    // Obtener todos los perfiles de negocio con sus categorías
    const profiles = await prisma.businessProfile.findMany({
      where,
      select: {
        id: true,
        userId: true,
        headline: true,
        description: true,
        categoryId: true,
        status: true,
        logoUrl: true,
        avgRating: true,
        totalReviews: true,
        website: true,
        city: true,
        whatsappPhone: true,
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        },
        user: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      },
      orderBy: [
        { avgRating: 'desc' },
        { totalReviews: 'desc' }
      ]
    });

    // Transformar los datos para el frontend
    const exhibitors = profiles.map(profile => ({
      id: profile.id,
      userId: profile.userId,
      headline: profile.headline,
      description: profile.description,
      categoryId: profile.categoryId,
      categoryName: profile.category?.name || 'Otro',
      categoryIcon: profile.category?.icon || '✨',
      userName: profile.user.nombre,
      userImage: profile.user.imagen,
      logoUrl: profile.logoUrl,
      status: profile.status,
      isReadyForBusiness: profile.status === 'ACTIVE',
      avgRating: profile.avgRating,
      totalReviews: profile.totalReviews,
      website: profile.website,
      city: profile.city,
      whatsappPhone: profile.whatsappPhone
    }));

    // Contar expositores por categoría
    const categoryMap = new Map<number, { id: number; name: string; icon: string; count: number }>();
    
    for (const exhibitor of exhibitors) {
      if (!categoryMap.has(exhibitor.categoryId)) {
        categoryMap.set(exhibitor.categoryId, {
          id: exhibitor.categoryId,
          name: exhibitor.categoryName,
          icon: exhibitor.categoryIcon,
          count: 0
        });
      }
      const cat = categoryMap.get(exhibitor.categoryId)!;
      cat.count++;
    }

    const categories = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      exhibitors,
      categories,
      total: exhibitors.length
    });

  } catch (error) {
    logger.error('Error obteniendo catálogo:', error);
    return NextResponse.json(
      { error: 'Error al obtener catálogo', exhibitors: [], categories: [] },
      { status: 500 }
    );
  }
}
