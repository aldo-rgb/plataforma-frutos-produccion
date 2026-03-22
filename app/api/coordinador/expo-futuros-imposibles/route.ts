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

    // Verificar que el coordinador tiene acceso a esta visión
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const visionIdNum = parseInt(visionId);

    // Verificar si tiene acceso a esta visión
    const visionStaff = await prisma.visionStaff.findFirst({
      where: {
        userId: usuario.id,
        visionId: visionIdNum
      }
    });

    // Verificar acceso: es staff de la visión o es admin/coordinador de su organización
    const allowedRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'SCHOOL_ADMIN', 'ADMIN'];
    const hasAccess = visionStaff || 
                     (allowedRoles.includes(usuario.rol) && usuario.organizationId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta visión' }, { status: 403 });
    }

    // Obtener participantes de la visión con sus negocios y reviews de expo
    const participants = await prisma.usuario.findMany({
      where: {
        vision_enrollments: {
          some: {
            visionId: visionIdNum,
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        profileImage: true,
        // Negocio del usuario (BusinessProfile)
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
        // Reviews recibidas como exhibitor en la expo
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
          take: 10
        },
        // Visitantes que refirió a la expo
        ExpoVisitor: {
          select: {
            id: true,
            name: true,
            registeredAt: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Procesar los datos de los participantes
    const processedParticipants = participants.map(p => {
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

      const businessProfile = p.BusinessProfile?.[0];

      return {
        id: p.id,
        nombre: p.nombre,
        email: p.email,
        telefono: p.telefono,
        profileImage: p.profileImage,
        businessName: businessProfile?.headline || null,
        businessCategory: businessProfile?.BusinessCategory?.name || null,
        expoRegistrations: (p.ExpoVisitor?.length || 0) + totalRatings, // Visitantes referidos + reviews recibidas
        avgRating: avgRating ? parseFloat(avgRating.toFixed(2)) : (businessProfile?.avgRating || null),
        totalRatings: totalRatings || (businessProfile?.totalReviews || 0),
        lastRating
      };
    });

    // Calcular estadísticas generales
    const participantsWithBusiness = processedParticipants.filter(p => p.businessName);
    const participantsWithRating = processedParticipants.filter(p => p.avgRating !== null && p.avgRating > 0);
    
    const stats = {
      totalParticipants: processedParticipants.length,
      totalBusinesses: participantsWithBusiness.length,
      totalRegistrations: processedParticipants.reduce((sum, p) => sum + p.expoRegistrations, 0),
      avgRating: participantsWithRating.length > 0
        ? participantsWithRating.reduce((sum, p) => sum + (p.avgRating || 0), 0) / participantsWithRating.length
        : null,
      participantsWithRating: participantsWithRating.length
    };

    return NextResponse.json({
      participants: processedParticipants,
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
