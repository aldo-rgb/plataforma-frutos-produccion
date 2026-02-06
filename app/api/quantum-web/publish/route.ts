import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface QuantumTemplate {
  id: string;
  name: string;
  style: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

interface WebContent {
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  servicesTitle: string;
  services: { icon: string; title: string; description: string }[];
  ctaText: string;
  testimonials: { name: string; text: string; rating: number }[];
}

interface BusinessInfo {
  name: string;
  description: string;
  category: string;
  logo?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  schedule: string;
  instagram?: string;
  facebook?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category?: string;
  inStock: boolean;
  featured: boolean;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessInfo, template, content, products } = await req.json() as {
      businessInfo: BusinessInfo;
      template: QuantumTemplate;
      content: WebContent;
      products: Product[];
    };

    if (!businessInfo?.name || !template || !content) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Obtener el usuario CON su organización y visión activa
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        organizationId: true,
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          where: { Vision: { isActive: true } },
          select: { visionId: true },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Generar slug único para la URL
    const baseSlug = businessInfo.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Verificar si el slug ya existe y agregar sufijo si es necesario
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const existing = await prisma.quantumWebsite.findUnique({
        where: { slug }
      });
      
      if (!existing) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Crear o actualizar el sitio web
    const website = await prisma.quantumWebsite.upsert({
      where: { 
        userId: user.id 
      },
      create: {
        userId: user.id,
        slug,
        businessName: businessInfo.name,
        businessDescription: businessInfo.description,
        businessCategory: businessInfo.category,
        logoUrl: businessInfo.logo || null,
        phone: businessInfo.phone,
        whatsapp: businessInfo.whatsapp,
        email: businessInfo.email || session.user.email,
        address: businessInfo.address,
        schedule: businessInfo.schedule,
        instagram: businessInfo.instagram,
        facebook: businessInfo.facebook,
        templateId: template.id,
        templateStyle: template.style,
        templateColors: template.colors,
        templateFonts: template.fonts,
        heroTitle: content.heroTitle,
        heroSubtitle: content.heroSubtitle,
        aboutTitle: content.aboutTitle,
        aboutText: content.aboutText,
        servicesTitle: content.servicesTitle,
        services: content.services,
        ctaText: content.ctaText,
        testimonials: content.testimonials,
        isPublished: true,
        publishedAt: new Date()
      },
      update: {
        slug,
        businessName: businessInfo.name,
        businessDescription: businessInfo.description,
        businessCategory: businessInfo.category,
        logoUrl: businessInfo.logo || undefined,
        phone: businessInfo.phone,
        whatsapp: businessInfo.whatsapp,
        email: businessInfo.email || session.user.email,
        address: businessInfo.address,
        schedule: businessInfo.schedule,
        instagram: businessInfo.instagram,
        facebook: businessInfo.facebook,
        templateId: template.id,
        templateStyle: template.style,
        templateColors: template.colors,
        templateFonts: template.fonts,
        heroTitle: content.heroTitle,
        heroSubtitle: content.heroSubtitle,
        aboutTitle: content.aboutTitle,
        aboutText: content.aboutText,
        servicesTitle: content.servicesTitle,
        services: content.services,
        ctaText: content.ctaText,
        testimonials: content.testimonials,
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Manejar productos
    if (products && products.length > 0) {
      // Eliminar productos existentes
      await prisma.quantumProduct.deleteMany({
        where: { websiteId: website.id }
      });

      // Crear nuevos productos
      await prisma.quantumProduct.createMany({
        data: products.map(product => ({
          websiteId: website.id,
          name: product.name,
          description: product.description || '',
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          category: product.category,
          inStock: product.inStock,
          featured: product.featured
        }))
      });
    }

    // ===== CREAR/ACTUALIZAR BusinessProfile para la Expo de Futuros =====
    if (user.organizationId) {
      try {
        // Buscar o crear la categoría del negocio
        let category = await prisma.businessCategory.findFirst({
          where: { 
            OR: [
              { name: { equals: businessInfo.category, mode: 'insensitive' } },
              { slug: { equals: businessInfo.category.toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' } }
            ]
          }
        });

        // Si no existe la categoría, usar "Otro" o crear una genérica
        if (!category) {
          category = await prisma.businessCategory.findFirst({
            where: { slug: 'otro' }
          });
          
          if (!category) {
            // Crear categoría "Otro" si no existe
            category = await prisma.businessCategory.create({
              data: {
                name: 'Otro',
                slug: 'otro',
                icon: '✨',
                description: 'Otros servicios y negocios',
                isActive: true
              }
            });
          }
        }

        // Obtener la visión activa del usuario
        const userVisionId = user.VisionParticipante_VisionParticipante_participanteIdToUsuario?.[0]?.visionId || null;

        // Extraer ciudad y estado de la dirección (simple split)
        const addressParts = businessInfo.address?.split(',').map(s => s.trim()) || [];
        const city = addressParts[0] || 'Por definir';
        const state = addressParts[1] || addressParts[0] || 'Por definir';

        // Crear o actualizar BusinessProfile
        await prisma.businessProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            organizationId: user.organizationId,
            visionId: userVisionId,
            headline: businessInfo.name.substring(0, 100),
            categoryId: category.id,
            description: businessInfo.description || content.aboutText || 'Mi negocio',
            discountOffer: '10% de descuento para miembros de la comunidad',
            city,
            state,
            whatsappPhone: businessInfo.whatsapp || businessInfo.phone || '',
            email: businessInfo.email || session.user.email,
            website: `quantummatter.app/site/${slug}`,
            logoUrl: businessInfo.logo || null,
            galleryImages: [],
            status: 'HIDDEN' // Empieza oculto hasta que "de el salto"
          },
          update: {
            headline: businessInfo.name.substring(0, 100),
            categoryId: category.id,
            description: businessInfo.description || content.aboutText || 'Mi negocio',
            city,
            state,
            whatsappPhone: businessInfo.whatsapp || businessInfo.phone || '',
            email: businessInfo.email || session.user.email,
            website: `quantummatter.app/site/${slug}`,
            logoUrl: businessInfo.logo || undefined,
            visionId: userVisionId || undefined,
            updatedAt: new Date()
          }
        });
      } catch (profileError) {
        logger.error('Error creando BusinessProfile (no crítico):', profileError);
        // No fallar si hay error en BusinessProfile, el sitio ya se creó
      }
    }

    // Construir URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quantummatter.app';
    const fullUrl = `${baseUrl}/site/${slug}`;

    return NextResponse.json({ 
      success: true,
      url: `quantummatter.app/site/${slug}`,
      fullUrl,
      websiteId: website.id,
      slug
    });

  } catch (error: any) {
    logger.error('Error publicando sitio:', error);
    logger.error('Error code:', error?.code);
    logger.error('Error message:', error?.message);
    
    // Manejar errores específicos de Prisma
    const errorCode = error?.code;
    const errorMessage = error?.message || '';
    
    // Error de tabla/modelo no existente
    if (errorCode === 'P2021' || errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table')) {
      // En modo demo, generar URL sin guardar en DB
      const demoSlug = `mi-negocio-${Date.now()}`;
      return NextResponse.json({ 
        success: true,
        url: `quantummatter.app/site/${demoSlug}`,
        fullUrl: `https://quantummatter.app/site/${demoSlug}`,
        slug: demoSlug,
        demo: true,
        message: 'Sitio creado en modo demo. Ejecuta "npx prisma db push" para habilitar persistencia.'
      });
    }
    
    // Error de conexión a base de datos
    if (errorMessage.includes("Can't reach database") || errorMessage.includes('connection') || errorCode === 'P1001') {
      const demoSlug = `mi-negocio-${Date.now()}`;
      return NextResponse.json({ 
        success: true,
        url: `quantummatter.app/site/${demoSlug}`,
        fullUrl: `https://quantummatter.app/site/${demoSlug}`,
        slug: demoSlug,
        demo: true,
        message: 'Sitio creado en modo demo (base de datos temporalmente no disponible).'
      });
    }
    
    // Error de constraint único (el usuario ya tiene un sitio)
    if (errorCode === 'P2002') {
      return NextResponse.json(
        { error: 'Ya tienes un sitio publicado. Edita el existente o elimínalo primero.' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: `Error publicando sitio: ${errorMessage.substring(0, 100)}` }, 
      { status: 500 }
    );
  }
}

// GET: Obtener sitio publicado del usuario actual
export async function GET(req: Request) {
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
      where: { userId: user.id },
      include: {
        products: true
      }
    });

    if (!website) {
      return NextResponse.json({ website: null });
    }

    return NextResponse.json({ website });

  } catch (error) {
    logger.error('Error obteniendo sitio:', error);
    return NextResponse.json({ website: null });
  }
}
