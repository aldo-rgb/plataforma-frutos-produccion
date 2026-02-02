import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import LegacyCatalogClient from './LegacyCatalogClient';

export const metadata: Metadata = {
  title: 'Legados de Impacto | Proyectos Sociales',
  description: 'Explora y apoya proyectos de impacto social en tu comunidad. Donaciones transparentes con seguimiento en tiempo real.',
  openGraph: {
    title: 'Legados de Impacto | Proyectos Sociales',
    description: 'Explora y apoya proyectos de impacto social en tu comunidad.',
    type: 'website',
  },
};

export default async function LegacyCatalogPage() {
  // Obtener campañas activas y públicas
  const campaigns = await prisma.legacyCampaign.findMany({
    where: {
      status: 'ACTIVE',
      isPublic: true,
    },
    include: {
      vision: {
        select: { 
          id: true,
          nombre: true, 
          tribeLogoUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
          category: true,
          organization: {
            select: { name: true, logoUrl: true },
          },
        },
      },
      _count: {
        select: { 
          donations: { where: { paymentStatus: 'COMPLETED' } },
        },
      },
    },
    orderBy: [
      { raisedAmount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50,
  });

  // Obtener categorías únicas
  const categories = [...new Set(campaigns.map(c => c.project?.category).filter(Boolean))];

  // Formatear datos para el cliente
  const formattedCampaigns = campaigns.map(c => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description || '',
    coverImage: c.coverImage,
    logoImage: c.logoImage || c.vision.tribeLogoUrl,
    goalAmount: Number(c.goalAmount),
    raisedAmount: Number(c.raisedAmount),
    category: c.project?.category || 'OTHER',
    organizationName: c.project?.organization?.name || '',
    visionName: c.vision.nombre,
    donationsCount: c._count.donations,
    isFeatured: Number(c.raisedAmount) > 10000, // Featured si tiene más de 10k recaudados
    endDate: c.endDate?.toISOString(),
  }));

  return (
    <LegacyCatalogClient 
      initialCampaigns={formattedCampaigns}
      categories={categories as string[]}
    />
  );
}
