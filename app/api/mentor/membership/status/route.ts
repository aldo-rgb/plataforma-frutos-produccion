import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/mentor/membership/status
 * Obtiene el estado de la membresía del mentor
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);

    // Buscar perfil de mentor
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: userId },
      include: {
        MentorMembershipRenewal: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    if (!perfilMentor) {
      return NextResponse.json(
        { error: 'No tienes un perfil de mentor' },
        { status: 404 }
      );
    }

    const now = new Date();
    const expiryDate = perfilMentor.membershipExpiryDate;
    
    let daysUntilExpiry = null;
    let isExpired = false;
    let isExpiringSoon = false;

    if (expiryDate) {
      const diffTime = expiryDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpired = daysUntilExpiry < 0;
      isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }

    return NextResponse.json({
      success: true,
      membership: {
        active: perfilMentor.membershipActive,
        startDate: perfilMentor.membershipStartDate,
        expiryDate: perfilMentor.membershipExpiryDate,
        approvedAt: perfilMentor.membershipApprovedAt,
        autoRenewalEnabled: perfilMentor.autoRenewalEnabled,
        daysUntilExpiry,
        isExpired,
        isExpiringSoon,
        stripeCustomerId: perfilMentor.stripeCustomerId,
        stripeSubscriptionId: perfilMentor.stripeSubscriptionId
      },
      renewalHistory: perfilMentor.MentorMembershipRenewal
    });

  } catch (error) {
    logger.error('Error fetching membership status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de membresía' },
      { status: 500 }
    );
  }
}
