import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('[my-site] Session email:', session?.user?.email);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el usuario
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    console.log('[my-site] User found:', user?.id, user?.nombre);

    if (!user) {
      return NextResponse.json({ hasSite: false });
    }

    // Buscar sitio web existente
    const website = await prisma.quantumWebsite.findUnique({
      where: { userId: user.id },
      include: {
        QuantumProduct: true
      }
    });

    console.log('[my-site] Website found:', website?.id, website?.slug, 'isPublished:', website?.isPublished);

    if (!website) {
      console.log('[my-site] No website found for user', user.id);
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
        siteType: website.siteType || 'catalog',
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
        appointmentServices: website.appointmentServices,
        ctaText: website.ctaText,
        testimonials: website.testimonials,
        products: website.QuantumProduct,
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

// PATCH - Actualizar campos específicos del sitio
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const website = await prisma.quantumWebsite.findUnique({
      where: { userId: user.id }
    });

    if (!website) {
      return NextResponse.json({ error: 'No tienes un sitio web' }, { status: 404 });
    }

    const body = await request.json();
    const { address, schedule, phone, whatsapp } = body;

    // Construir objeto de actualización con solo los campos proporcionados
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    if (address !== undefined) updateData.address = address;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;

    const updatedSite = await prisma.quantumWebsite.update({
      where: { userId: user.id },
      data: updateData
    });

    console.log('[my-site PATCH] Actualizado:', updateData);

    return NextResponse.json({ 
      success: true, 
      site: {
        address: updatedSite.address,
        schedule: updatedSite.schedule,
        phone: updatedSite.phone,
        whatsapp: updatedSite.whatsapp
      }
    });

  } catch (error: any) {
    logger.error('Error actualizando sitio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
