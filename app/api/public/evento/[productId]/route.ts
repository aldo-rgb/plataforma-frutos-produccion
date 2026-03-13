import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener un producto/evento público por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const id = parseInt(productId);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    const product = await prisma.schoolProduct.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        type: true,
        basePrice: true,
        promoPrice: true,
        promoDeadline: true,
        startDate: true,
        endDate: true,
        maxCapacity: true,
        currentEnrollment: true,
        location: true,
        videoUrl: true,
        isActive: true,
        organizationId: true,
        Organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            brandColor: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: 'Este evento ya no está disponible' },
        { status: 404 }
      );
    }

    // Obtener otros talleres de la misma organización (solo EXTRA_WORKSHOP)
    let otherTrainings: any[] = [];
    if (product.organizationId) {
      otherTrainings = await prisma.schoolProduct.findMany({
        where: {
          organizationId: product.organizationId,
          isActive: true,
          id: { not: product.id }, // Excluir el producto actual
          type: 'EXTRA_WORKSHOP', // Solo talleres
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          type: true,
          basePrice: true,
          promoPrice: true,
          startDate: true,
          location: true,
        },
        orderBy: [
          { startDate: 'asc' },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      product,
      otherTrainings,
    });
  } catch (error) {
    console.error('Error fetching public event:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar el evento' },
      { status: 500 }
    );
  }
}
