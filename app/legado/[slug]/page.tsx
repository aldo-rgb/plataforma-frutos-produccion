import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PublicCampaignPage from './PublicCampaignPage';

interface PageProps {
  params: { slug: string };
  searchParams: { ref?: string };
}

export async function generateMetadata({ params }: PageProps) {
  const campaign = await prisma.legacyCampaign.findUnique({
    where: { slug: params.slug },
    include: {
      project: true
    }
  });

  if (!campaign) {
    return { title: 'Campaña no encontrada' };
  }

  return {
    title: `${campaign.title} | Legacy Builder`,
    description: campaign.description || `Apoya a ${campaign.title} - ${campaign.project.title}`,
    openGraph: {
      title: campaign.title,
      description: campaign.description || `Apoya a ${campaign.title}`,
      images: campaign.coverImage ? [campaign.coverImage] : [],
    }
  };
}

export default async function CampaignPublicPage({ params, searchParams }: PageProps) {
  const campaign = await prisma.legacyCampaign.findUnique({
    where: { 
      slug: params.slug,
      status: 'ACTIVE',
      isPublic: true
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
          category: true,
          organization: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
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
        take: 10,
        select: {
          id: true,
          donorName: true,
          amount: true,
          message: true,
          showMessage: true,
          isAnonymous: true,
          createdAt: true
        }
      },
      expenses: {
        orderBy: { amount: 'desc' },
        select: {
          id: true,
          concept: true,
          amount: true,
          publicImageUrl: true,
          publishedAt: true,
          status: true,
          isPublished: true
        }
      },
      _count: {
        select: {
          donations: { where: { paymentStatus: 'COMPLETED' } },
          members: true
        }
      }
    }
  });

  if (!campaign) {
    notFound();
  }

  // Separar gastos planeados y comprobados
  const plannedExpenses = campaign.expenses
    .filter((e: any) => e.status === 'PLANNED')
    .map((e: any) => ({ concept: e.concept, amount: Number(e.amount) }));
  
  const publishedExpenses = campaign.expenses
    .filter((e: any) => e.isPublished)
    .map((e: any) => ({ ...e, amount: Number(e.amount) }));

  // Preparar datos para el cliente
  const campaignData = {
    ...campaign,
    goalAmount: Number(campaign.goalAmount),
    raisedAmount: Number(campaign.raisedAmount),
    availableAmount: Number(campaign.availableAmount),
    donations: campaign.donations.map(d => ({
      ...d,
      amount: Number(d.amount),
      donorName: d.isAnonymous ? 'Donador Anónimo' : d.donorName,
      message: d.showMessage ? d.message : null
    })),
    expenses: publishedExpenses,
    plannedExpenses,
    project: {
      ...campaign.project,
      goalAmount: Number(campaign.project.goalAmount),
      raisedAmount: Number(campaign.project.raisedAmount)
    }
  };

  return <PublicCampaignPage campaign={campaignData} referralCode={searchParams.ref} />;
}
