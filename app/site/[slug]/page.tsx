import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Metadata } from 'next';
import PublicWebsite from './PublicWebsite';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generar metadata dinámica para SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const website = await prisma.quantumWebsite.findUnique({
      where: { slug, isPublished: true }
    });

    if (!website) {
      return {
        title: 'Sitio no encontrado',
        description: 'El sitio que buscas no existe o no está publicado.'
      };
    }

    return {
      title: website.businessName,
      description: website.businessDescription || website.heroSubtitle || `Bienvenido a ${website.businessName}`,
      openGraph: {
        title: website.businessName,
        description: website.businessDescription || website.heroSubtitle || `Bienvenido a ${website.businessName}`,
        type: 'website',
        images: website.heroImageUrl ? [website.heroImageUrl] : []
      },
      twitter: {
        card: 'summary_large_image',
        title: website.businessName,
        description: website.businessDescription || website.heroSubtitle || undefined
      }
    };
  } catch {
    return {
      title: 'Error',
      description: 'No se pudo cargar el sitio'
    };
  }
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params;
  
  try {
    const website = await prisma.quantumWebsite.findUnique({
      where: { slug, isPublished: true },
      include: {
        products: {
          orderBy: [
            { featured: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!website) {
      notFound();
    }

    // Incrementar contador de visitas (async, no bloqueante)
    prisma.quantumWebsite.update({
      where: { id: website.id },
      data: { viewCount: { increment: 1 } }
    }).catch(console.error);

    // Registrar visita (async, no bloqueante)
    prisma.quantumPageView.create({
      data: {
        websiteId: website.id,
        viewedAt: new Date()
      }
    }).catch(console.error);

    // Transformar datos para el componente cliente
    const websiteData = {
      id: website.id,
      slug: website.slug,
      businessName: website.businessName,
      businessDescription: website.businessDescription,
      businessCategory: website.businessCategory,
      phone: website.phone,
      whatsapp: website.whatsapp,
      email: website.email,
      address: website.address,
      schedule: website.schedule,
      instagram: website.instagram,
      facebook: website.facebook,
      logoUrl: website.logoUrl,
      heroImageUrl: website.heroImageUrl,
      galleryImages: website.galleryImages,
      templateId: website.templateId,
      templateStyle: website.templateStyle,
      templateColors: website.templateColors as {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
      },
      templateFonts: website.templateFonts as {
        heading: string;
        body: string;
      },
      heroTitle: website.heroTitle,
      heroSubtitle: website.heroSubtitle,
      aboutTitle: website.aboutTitle,
      aboutText: website.aboutText,
      servicesTitle: website.servicesTitle,
      services: website.services as { icon: string; title: string; description: string }[] | null,
      ctaText: website.ctaText,
      testimonials: website.testimonials as { name: string; text: string; rating: number }[] | null,
      products: website.products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        image: p.image,
        category: p.category,
        inStock: p.inStock,
        featured: p.featured
      }))
    };

    return <PublicWebsite website={websiteData} />;
    
  } catch (error) {
    console.error('Error cargando sitio:', error);
    notFound();
  }
}
