import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener reseñas de un perfil
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'profileId es requerido' }, { status: 400 });
    }

    const reviews = await prisma.serviceReview.findMany({
      where: {
        profileId: parseInt(profileId),
        isPublic: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
          }
        }
      }
    });

    // Obtener estadísticas de calificaciones
    const stats = await prisma.serviceReview.groupBy({
      by: ['rating'],
      where: { profileId: parseInt(profileId), isPublic: true },
      _count: true,
    });

    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    stats.forEach((s: { rating: number; _count: number }) => {
      ratingDistribution[s.rating as keyof typeof ratingDistribution] = s._count;
    });

    return NextResponse.json({ reviews, ratingDistribution });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Error al obtener reseñas' }, { status: 500 });
  }
}

// POST - Crear reseña y verificar auto-ban
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const authorId = Number(session.user.id);
    const body = await request.json();
    const { profileId, rating, comment, didHireService } = body;

    // Validaciones
    if (!profileId) {
      return NextResponse.json({ error: 'profileId es requerido' }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'La calificación debe ser entre 1 y 5' }, { status: 400 });
    }
    if (!comment || comment.trim().length < 10) {
      return NextResponse.json({ error: 'El comentario debe tener al menos 10 caracteres' }, { status: 400 });
    }

    // Verificar que el perfil existe y está activo
    const profile = await prisma.businessProfile.findUnique({
      where: { id: parseInt(profileId) },
      select: {
        id: true,
        userId: true,
        status: true,
        oneStarCount: true,
        organizationId: true,
        user: { select: { nombre: true, email: true } }
      }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // No permitir reseñar tu propio perfil
    if (profile.userId === authorId) {
      return NextResponse.json({ error: 'No puedes reseñar tu propio perfil' }, { status: 400 });
    }

    // Verificar que el autor pertenece a la misma organización
    const author = await prisma.usuario.findUnique({
      where: { id: authorId },
      select: { organizationId: true, nombre: true }
    });

    if (author?.organizationId !== profile.organizationId) {
      return NextResponse.json({ 
        error: 'Solo puedes reseñar perfiles de tu organización' 
      }, { status: 403 });
    }

    // Verificar si ya dejó una reseña
    const existingReview = await prisma.serviceReview.findUnique({
      where: {
        profileId_authorId: {
          profileId: parseInt(profileId),
          authorId
        }
      }
    });

    if (existingReview) {
      return NextResponse.json({ error: 'Ya has dejado una reseña para este perfil' }, { status: 400 });
    }

    // Crear la reseña
    const review = await prisma.serviceReview.create({
      data: {
        profileId: parseInt(profileId),
        authorId,
        rating,
        comment: comment.trim(),
        didHireService: didHireService || false,
      },
      include: {
        author: {
          select: { id: true, nombre: true, imagen: true }
        }
      }
    });

    // Actualizar estadísticas del perfil
    const allReviews = await prisma.serviceReview.findMany({
      where: { profileId: parseInt(profileId) },
      select: { rating: true }
    });

    const totalReviews = allReviews.length;
    const avgRating = allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews;
    const oneStarCount = allReviews.filter((r: { rating: number }) => r.rating === 1).length;

    // Determinar si se debe banear (5+ reseñas de 1 estrella)
    const shouldBan = oneStarCount >= 5;

    await prisma.businessProfile.update({
      where: { id: parseInt(profileId) },
      data: {
        avgRating: Math.round(avgRating * 10) / 10, // Redondear a 1 decimal
        totalReviews,
        oneStarCount,
        status: shouldBan ? 'BANNED' : profile.status,
        suspendedAt: shouldBan ? new Date() : undefined,
        suspensionReason: shouldBan ? 'Suspendido automáticamente por recibir 5+ reseñas de 1 estrella' : undefined,
      }
    });

    // Si se baneó, enviar notificación (aquí podrías enviar un email)
    if (shouldBan) {
      logger.debug(`[AUTO-BAN] Usuario ${profile.user.nombre} (${profile.user.email}) ha sido baneado del directorio por reseñas negativas`);
      
      // Crear notificación para el usuario
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'SYSTEM_ALERT',
          title: 'Perfil Suspendido',
          message: '⚠️ Tu perfil en el Directorio de Talentos ha sido suspendido automáticamente debido a múltiples reseñas negativas. Contacta a soporte si crees que esto es un error.',
          isRead: false,
        }
      });
    }

    // Si la calificación es baja (1-2 estrellas) y aún no está baneado, enviar alerta
    if (rating <= 2 && !shouldBan && avgRating < 3.0) {
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'SYSTEM_ALERT',
          title: 'Reputación Bajando',
          message: `📉 Tu reputación en el Directorio de Talentos está bajando. Promedio actual: ${avgRating.toFixed(1)}⭐. Revisa tus servicios para mejorar la experiencia de tus clientes.`,
          isRead: false,
        }
      });
    }

    return NextResponse.json({ 
      review,
      profileUpdated: {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        wasBanned: shouldBan
      }
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating review:', error);
    return NextResponse.json({ error: 'Error al crear reseña' }, { status: 500 });
  }
}

// DELETE - Eliminar mi propia reseña
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const authorId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('id');

    if (!reviewId) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }

    // Verificar que la reseña existe y es del usuario
    const review = await prisma.serviceReview.findUnique({
      where: { id: parseInt(reviewId) }
    });

    if (!review) {
      return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 });
    }

    if (review.authorId !== authorId) {
      return NextResponse.json({ error: 'No puedes eliminar reseñas de otros usuarios' }, { status: 403 });
    }

    const profileId = review.profileId;
    const deletedRating = review.rating;

    // Eliminar la reseña
    await prisma.serviceReview.delete({
      where: { id: parseInt(reviewId) }
    });

    // Recalcular estadísticas del perfil
    const allReviews = await prisma.serviceReview.findMany({
      where: { profileId },
      select: { rating: true }
    });

    const totalReviews = allReviews.length;
    const avgRating = totalReviews > 0 
      ? allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews 
      : 0;
    const oneStarCount = allReviews.filter((r: { rating: number }) => r.rating === 1).length;

    // Actualizar perfil (no revertir ban automáticamente)
    await prisma.businessProfile.update({
      where: { id: profileId },
      data: {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        oneStarCount,
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Reseña eliminada correctamente'
    });
  } catch (error) {
    logger.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Error al eliminar reseña' }, { status: 500 });
  }
}
