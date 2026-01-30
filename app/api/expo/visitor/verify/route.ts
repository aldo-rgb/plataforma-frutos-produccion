import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }

    // Buscar visitante por token
    const visitor = await prisma.expoVisitor.findUnique({
      where: { token },
      include: {
        reviews: {
          include: {
            exhibitor: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitante no encontrado' },
        { status: 404 }
      );
    }

    // Formatear ratings
    const ratings = visitor.reviews.map((review: any) => ({
      id: review.id,
      exhibitorId: review.exhibitorId,
      exhibitorName: review.exhibitor.nombre,
      exhibitorImage: review.exhibitor.imagen,
      rating: review.ratingStars,
      ratedAt: review.createdAt.toISOString()
    }));

    return NextResponse.json({
      valid: true,
      name: visitor.name,
      ratings
    });

  } catch (error) {
    console.error('Error verificando visitante:', error);
    return NextResponse.json(
      { error: 'Error al verificar' },
      { status: 500 }
    );
  }
}
