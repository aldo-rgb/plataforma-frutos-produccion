import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
        ExpoReview: {
          include: {
            Usuario_ExpoReview_exhibitorIdToUsuario: {
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
    const ratings = visitor.ExpoReview.map((review: any) => ({
      id: review.id,
      exhibitorId: review.exhibitorId,
      exhibitorName: review.Usuario_ExpoReview_exhibitorIdToUsuario.nombre,
      exhibitorImage: review.Usuario_ExpoReview_exhibitorIdToUsuario.imagen,
      rating: review.ratingStars,
      ratedAt: review.createdAt.toISOString()
    }));

    return NextResponse.json({
      valid: true,
      name: visitor.name,
      ratings
    });

  } catch (error) {
    logger.error('Error verificando visitante:', error);
    return NextResponse.json(
      { error: 'Error al verificar' },
      { status: 500 }
    );
  }
}
