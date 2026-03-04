import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET /api/expo/my-reviews
// Obtiene las calificaciones que ha recibido el usuario autenticado en la Expo
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    
    console.log('[my-reviews] Buscando reviews para userId:', userId);

    // Obtener todas las reviews del usuario como expositor
    const reviews = await prisma.expoReview.findMany({
      where: {
        exhibitorId: userId
      },
      select: {
        id: true,
        ratingStars: true,
        hiringIntent: true,
        feedbackText: true,
        visitorName: true,
        visitorPhone: true,
        visitorEmail: true,
        createdAt: true,
        visitor: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('[my-reviews] Reviews encontradas:', reviews.length);

    // Calcular estadísticas
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + r.ratingStars, 0) / totalReviews 
      : 0;

    const hiringIntentCounts = {
      YES: reviews.filter(r => r.hiringIntent === 'YES').length,
      MAYBE: reviews.filter(r => r.hiringIntent === 'MAYBE').length,
      NO: reviews.filter(r => r.hiringIntent === 'NO').length
    };

    // Hot leads (personas interesadas en contratar)
    const hotLeads = reviews.filter(r => r.hiringIntent === 'YES');
    const warmLeads = reviews.filter(r => r.hiringIntent === 'MAYBE');

    return NextResponse.json({
      success: true,
      reviews,
      stats: {
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        hiringIntentCounts,
        hotLeadsCount: hotLeads.length,
        warmLeadsCount: warmLeads.length
      },
      hotLeads: hotLeads.map(r => ({
        name: r.visitorName,
        phone: r.visitorPhone,
        email: r.visitorEmail,
        feedback: r.feedbackText,
        rating: r.ratingStars,
        createdAt: r.createdAt
      })),
      warmLeads: warmLeads.map(r => ({
        name: r.visitorName,
        phone: r.visitorPhone,
        email: r.visitorEmail,
        feedback: r.feedbackText,
        rating: r.ratingStars,
        createdAt: r.createdAt
      }))
    });

  } catch (error) {
    logger.error('Error fetching expo reviews:', error);
    return NextResponse.json(
      { error: 'Error al obtener las calificaciones' },
      { status: 500 }
    );
  }
}
