import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener detalle de una campaña específica (mi bóveda)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const campaignId = parseInt(params.id);

    // Verificar membresía
    const membership = await prisma.legacyCampaignMember.findUnique({
      where: {
        campaignId_userId: {
          campaignId: campaignId,
          userId: userId
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'No eres miembro de esta campaña' }, { status: 403 });
    }

    // Obtener campaña con detalles
    const campaign = await prisma.legacyCampaign.findUnique({
      where: { id: campaignId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            goalAmount: true,
            raisedAmount: true,
            category: true,
            status: true
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
        donations: {
          where: { paymentStatus: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            donorName: true,
            amount: true,
            message: true,
            showMessage: true,
            isAnonymous: true,
            createdAt: true,
            referredById: true
          }
        },
        expenses: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            concept: true,
            amount: true,
            status: true,
            isPublished: true,
            publicImageUrl: true,
            createdAt: true,
            auditedAt: true
          }
        },
        members: {
          orderBy: { totalRaised: 'desc' },
          take: 10,
          select: {
            id: true,
            userId: true,
            totalRaised: true,
            donationsCount: true,
            role: true,
            user: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          }
        },
        _count: {
          select: {
            donations: true,
            members: true
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Estadísticas personales
    const myDonationsReferred = await prisma.legacyDonation.aggregate({
      where: {
        campaignId: campaignId,
        referredById: membership.id,
        paymentStatus: 'COMPLETED'
      },
      _sum: { amount: true },
      _count: true
    });

    // Gastos pendientes de mi solicitud
    const myExpenses = await prisma.legacyExpense.findMany({
      where: {
        campaignId: campaignId,
        requestedById: userId
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      campaign: {
        ...campaign,
        // Formatear donaciones para privacidad
        donations: campaign.donations.map(d => ({
          ...d,
          donorName: d.isAnonymous ? 'Donador Anónimo' : d.donorName,
          message: d.showMessage ? d.message : null
        })),
        // Solo mostrar gastos publicados o propios
        expenses: campaign.expenses.filter(e => 
          e.isPublished || 
          myExpenses.some(me => me.id === e.id)
        )
      },
      membership: {
        ...membership,
        myRaised: myDonationsReferred._sum.amount || 0,
        myReferralsCount: myDonationsReferred._count
      },
      myExpenses,
      wallet: {
        totalRaised: campaign.raisedAmount,
        available: campaign.availableAmount,
        spent: Number(campaign.raisedAmount) - Number(campaign.availableAmount)
      }
    });

  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
