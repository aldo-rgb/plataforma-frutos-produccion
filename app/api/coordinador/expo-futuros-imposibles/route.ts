import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'Vision ID requerido' }, { status: 400 });
    }

    const visionIdNum = parseInt(visionId);

    // Obtener enrollments de la visión con nivel PL (Liderato)
    // "Asistencia en Liderato" = participantes inscritos en nivel PL
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: visionIdNum,
        level: 'PL', // Solo nivel Liderato
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
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
                createdAt: true,
                visitorName: true
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 5
            },
            ExpoVisitor: {
              select: {
                id: true,
                name: true,
                registeredAt: true
              }
            },
            // Contar visitantes referidos por este participante
            _count: {
              select: {
                ExpoVisitor: true
              }
            }
          }
        }
      }
    });

    // Procesar los datos de los participantes
    const processedParticipants = enrollments
      .map(e => e.Usuario_vision_enrollments_userIdToUsuario)
      .filter(Boolean)
      .map(p => {
        const reviews = p.ExpoReview_ExpoReview_exhibitorIdToUsuario || [];
        const totalRatings = reviews.length;
        const avgRating = totalRatings > 0 
          ? reviews.reduce((sum, r) => sum + r.ratingStars, 0) / totalRatings 
          : null;
        
        const lastRating = reviews[0] ? {
          score: reviews[0].ratingStars,
          comment: reviews[0].feedbackText || '',
          ratedAt: reviews[0].createdAt.toISOString(),
          ratedBy: reviews[0].visitorName || 'Visitante'
        } : undefined;

        const businessProfile = p.BusinessProfile;
        const referredVisitors = p._count?.ExpoVisitor || 0;

        return {
          id: p.id,
          nombre: p.nombre,
          email: p.email,
          telefono: p.telefono,
          profileImage: p.profileImage,
          businessName: businessProfile?.headline || null,
          businessCategory: businessProfile?.BusinessCategory?.name || null,
          expoRegistrations: (p.ExpoVisitor?.length || 0) + totalRatings,
          referredVisitors: referredVisitors, // Visitantes que usaron su link
          avgRating: avgRating ? parseFloat(avgRating.toFixed(2)) : (businessProfile?.avgRating || null),
          totalRatings: totalRatings || (businessProfile?.totalReviews || 0),
          lastRating
        };
      });

    // Eliminar duplicados por id
    const uniqueParticipants = processedParticipants.filter(
      (p, index, self) => index === self.findIndex(t => t.id === p.id)
    );

    // Ordenar por nombre
    uniqueParticipants.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Calcular estadísticas generales
    const participantsWithBusiness = uniqueParticipants.filter(p => p.businessName);
    const participantsWithRating = uniqueParticipants.filter(p => p.avgRating !== null && p.avgRating > 0);
    const totalReferredVisitors = uniqueParticipants.reduce((sum, p) => sum + (p.referredVisitors || 0), 0);
    
    const stats = {
      totalParticipants: uniqueParticipants.length,
      totalBusinesses: participantsWithBusiness.length,
      totalRegistrations: uniqueParticipants.reduce((sum, p) => sum + p.expoRegistrations, 0),
      totalReferredVisitors: totalReferredVisitors, // Total de invitados registrados
      avgRating: participantsWithRating.length > 0
        ? participantsWithRating.reduce((sum, p) => sum + (p.avgRating || 0), 0) / participantsWithRating.length
        : null,
      participantsWithRating: participantsWithRating.length
    };

    return NextResponse.json({
      participants: uniqueParticipants,
      stats
    });

  } catch (error) {
    console.error('Error fetching expo data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de expo' },
      { status: 500 }
    );
  }
}
