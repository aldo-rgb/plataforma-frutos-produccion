import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const participantId = parseInt(id);

    if (isNaN(participantId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Obtener datos del participante
    const usuario = await prisma.usuario.findUnique({
      where: { id: participantId },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        profileImage: true,
        BusinessProfile: {
          select: {
            id: true,
            headline: true,
            description: true,
            avgRating: true,
            totalReviews: true,
            BusinessCategory: {
              select: {
                name: true
              }
            }
          }
        },
        ExpoReview_ExpoReview_exhibitorIdToUsuario: {
          select: {
            id: true,
            ratingStars: true,
            feedbackText: true,
            visitorName: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20
        },
        ExpoVisitor: {
          select: {
            id: true,
            name: true,
            registeredAt: true
          },
          orderBy: {
            registeredAt: 'desc'
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 });
    }

    const reviews = usuario.ExpoReview_ExpoReview_exhibitorIdToUsuario || [];
    const visitors = usuario.ExpoVisitor || [];
    const totalRatings = reviews.length;
    const avgRating = totalRatings > 0 
      ? reviews.reduce((sum, r) => sum + r.ratingStars, 0) / totalRatings 
      : null;

    const participant = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      profileImage: usuario.profileImage,
      businessName: usuario.BusinessProfile?.headline || null,
      businessCategory: usuario.BusinessProfile?.BusinessCategory?.name || null,
      businessBio: usuario.BusinessProfile?.description || null,
      expoRegistrations: visitors.length + totalRatings,
      referredVisitors: visitors.length,
      avgRating: avgRating ? parseFloat(avgRating.toFixed(2)) : null,
      totalRatings: totalRatings,
      reviews: reviews.map(r => ({
        id: r.id,
        ratingStars: r.ratingStars,
        feedbackText: r.feedbackText || '',
        visitorName: r.visitorName || 'Visitante',
        createdAt: r.createdAt.toISOString()
      })),
      visitors: visitors.map(v => ({
        id: v.id,
        name: v.name,
        registeredAt: v.registeredAt.toISOString()
      }))
    };

    return NextResponse.json({ participant });

  } catch (error) {
    console.error('Error fetching participant detail:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del participante' },
      { status: 500 }
    );
  }
}
