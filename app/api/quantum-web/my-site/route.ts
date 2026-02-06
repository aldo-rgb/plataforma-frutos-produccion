import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el usuario
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ hasSite: false });
    }

    // Buscar sitio web existente
    const website = await prisma.quantumWebsite.findUnique({
      where: { userId: user.id },
      include: {
        products: true
      }
    });

    if (!website) {
      return NextResponse.json({ hasSite: false });
    }

    // Devolver los datos del sitio
    return NextResponse.json({
      hasSite: true,
      site: {
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
        templateColors: website.templateColors,
        templateFonts: website.templateFonts,
        // Contenido generado
        heroTitle: website.heroTitle,
        heroSubtitle: website.heroSubtitle,
        aboutTitle: website.aboutTitle,
        aboutText: website.aboutText,
        servicesTitle: website.servicesTitle,
        services: website.services,
        ctaText: website.ctaText,
        testimonials: website.testimonials,
        products: website.products,
        isPublished: website.isPublished,
        publishedAt: website.publishedAt,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt
      },
      url: `quantummatter.app/site/${website.slug}`
    });

  } catch (error: any) {
    logger.error('Error obteniendo sitio:', error);
    return NextResponse.json({ hasSite: false, error: error.message });
  }
}
