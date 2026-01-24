import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener campañas disponibles para el participante
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    
    // Obtener el usuario con su visión y organización
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        vision_enrollments_vision_enrollments_userIdToUsuario: {
          where: { enrollmentStatus: { in: ['ACTIVE', 'COMPLETED'] } },
          select: { visionId: true }
        }
      }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 400 });
    }

    const visionIds = user.vision_enrollments_vision_enrollments_userIdToUsuario.map(e => e.visionId);

    // Buscar campañas activas donde el usuario puede participar
    const campaigns = await prisma.legacyCampaign.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { visionId: { in: visionIds } }, // Campañas de sus visiones
          { 
            project: { 
              organizationId: user.organizationId,
              isPublic: true 
            } 
          } // Campañas públicas de su org
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            goalAmount: true,
            raisedAmount: true,
            category: true
          }
        },
        vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        captain: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        },
        _count: {
          select: {
            donations: true,
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Verificar membresía del usuario en cada campaña
    const campaignsWithMembership = await Promise.all(
      campaigns.map(async (campaign) => {
        const membership = await prisma.legacyCampaignMember.findUnique({
          where: {
            campaignId_userId: {
              campaignId: campaign.id,
              userId: userId
            }
          }
        });

        return {
          ...campaign,
          isMember: !!membership,
          memberRole: membership?.role || null,
          referralCode: membership?.referralCode || null,
          myRaised: membership?.totalRaised || 0
        };
      })
    );

    return NextResponse.json({
      campaigns: campaignsWithMembership
    });

  } catch (error) {
    console.error('Error fetching legacy campaigns:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Unirse a una campaña
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 });
    }

    // Verificar que la campaña existe y está activa
    const campaign = await prisma.legacyCampaign.findFirst({
      where: {
        id: campaignId,
        status: 'ACTIVE'
      },
      include: {
        project: true
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada o no activa' }, { status: 404 });
    }

    // Verificar si ya es miembro
    const existingMember = await prisma.legacyCampaignMember.findUnique({
      where: {
        campaignId_userId: {
          campaignId: campaignId,
          userId: userId
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Ya eres miembro de esta campaña' }, { status: 400 });
    }

    // Crear membresía
    const member = await prisma.legacyCampaignMember.create({
      data: {
        campaignId: campaignId,
        userId: userId,
        role: 'MEMBER',
        referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}/legado/${campaign.slug}`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Te has unido a la campaña exitosamente',
      member: {
        id: member.id,
        referralCode: member.referralCode,
        referralUrl: member.referralUrl
      }
    });

  } catch (error) {
    console.error('Error joining campaign:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
