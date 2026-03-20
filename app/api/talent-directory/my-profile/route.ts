import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener mi perfil de negocio
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const profile = await prisma.businessProfile.findUnique({
      where: { userId },
      include: {
        BusinessCategory: true,
        Organization: {
          select: { id: true, name: true, slug: true }
        },
        Vision: {
          select: { id: true, nombre: true }
        },
        ServiceReview: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            Usuario: {
              select: { id: true, nombre: true, imagen: true }
            }
          }
        },
        _count: {
          select: { ServiceReview: true }
        }
      }
    });

    // También verificar si el usuario es graduado de PL
    const graduation = await prisma.studentGraduation.findFirst({
      where: {
        userId,
        toLevel: 'PL',
      }
    });

    // Mapear para compatibilidad con frontend
    const mappedProfile = profile ? {
      ...profile,
      category: profile.BusinessCategory,
      organization: profile.Organization,
      vision: profile.Vision,
      reviews: profile.ServiceReview?.map(r => ({
        ...r,
        author: r.Usuario
      })),
      _count: { reviews: profile._count?.ServiceReview || 0 }
    } : null;

    return NextResponse.json({ 
      profile: mappedProfile, 
      isPLGraduate: !!graduation,
      hasProfile: !!profile 
    });
  } catch (error) {
    logger.error('Error fetching my profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}

// POST - Crear mi perfil de negocio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Verificar que el usuario pertenece a una organización y visión
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        telefono: true,
        email: true,
      }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ 
        error: 'Debes pertenecer a una organización para crear un perfil de negocio' 
      }, { status: 403 });
    }

    // Verificar si ya tiene perfil
    const existingProfile = await prisma.businessProfile.findUnique({
      where: { userId }
    });

    if (existingProfile) {
      return NextResponse.json({ error: 'Ya tienes un perfil de negocio' }, { status: 400 });
    }

    // Obtener la visión activa del usuario (opcional)
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
      },
      orderBy: { createdAt: 'desc' },
      select: { visionId: true }
    });

    const body = await request.json();
    const {
      headline,
      categoryId,
      categorySlug, // Nuevo: soporte para slug de categoría
      description,
      discountOffer,
      city,
      state,
      coverageZone,
      whatsappPhone,
      email,
      website,
      galleryImages,
      logoUrl,
      status, // HIDDEN = borrador, ACTIVE = publicado
      // Nuevos campos para Idea Millonaria
      slogan,
      targetAudience,
      mainSkill
    } = body;

    // Si el status es HIDDEN (borrador desde Idea Millonaria), permitir datos parciales
    const isDraft = status === 'HIDDEN';
    
    // Resolver categoryId desde categorySlug si se proporciona
    let resolvedCategoryId = categoryId;
    if (!categoryId && categorySlug) {
      // Buscar primero por slug exacto, luego intentar variantes
      const categoryFromSlug = await prisma.businessCategory.findFirst({
        where: { 
          OR: [
            { slug: categorySlug },
            { slug: categorySlug.toLowerCase() },
            // Mapeo de slugs del frontend a slugs de BD
            { slug: categorySlug === 'salud-bienestar' ? 'salud' : categorySlug },
            { slug: categorySlug === 'educacion-coaching' ? 'educacion' : categorySlug },
            { slug: categorySlug === 'arte-creatividad' ? 'arte' : categorySlug },
            { slug: categorySlug === 'belleza-estetica' ? 'belleza' : categorySlug },
            { slug: categorySlug === 'hogar-servicios' ? 'limpieza' : categorySlug },
            { slug: categorySlug === 'fitness-deportes' ? 'fitness' : categorySlug },
            { slug: categorySlug === 'moda-accesorios' ? 'comercio' : categorySlug },
            { slug: categorySlug === 'gastronomia' ? 'alimentos' : categorySlug },
            // Búsqueda por nombre parcial
            { name: { contains: categorySlug.replace(/-/g, ' '), mode: 'insensitive' } }
          ]
        }
      });
      if (categoryFromSlug) {
        resolvedCategoryId = categoryFromSlug.id;
      }
    }
    
    // Validaciones - solo aplicar estrictamente si NO es borrador
    if (!isDraft) {
      if (!headline || headline.length > 100) {
        return NextResponse.json({ error: 'El titular es requerido (máx 100 caracteres)' }, { status: 400 });
      }
      if (!resolvedCategoryId) {
        return NextResponse.json({ error: 'La categoría es requerida' }, { status: 400 });
      }
      if (!description || description.length < 20) {
        return NextResponse.json({ error: 'La descripción debe tener al menos 20 caracteres' }, { status: 400 });
      }
      if (!discountOffer) {
        return NextResponse.json({ error: 'El beneficio para la comunidad es obligatorio' }, { status: 400 });
      }
      if (!city || !state) {
        return NextResponse.json({ error: 'La ciudad y estado son requeridos' }, { status: 400 });
      }
      if (!whatsappPhone) {
        return NextResponse.json({ error: 'El teléfono de WhatsApp es requerido' }, { status: 400 });
      }
    }

    // Si es borrador, al menos necesita headline
    if (isDraft && !headline) {
      return NextResponse.json({ error: 'El nombre del negocio es requerido' }, { status: 400 });
    }

    // Verificar que la categoría existe (solo si se proporciona y no fue resuelta aún)
    if (resolvedCategoryId) {
      const category = await prisma.businessCategory.findUnique({
        where: { id: resolvedCategoryId }
      });
      if (!category) {
        return NextResponse.json({ error: 'Categoría no válida' }, { status: 400 });
      }
    }

    // Verificar si es graduado de PL
    const graduation = await prisma.studentGraduation.findFirst({
      where: {
        userId,
        toLevel: 'PL',
      }
    });

    // Para borradores, obtener o crear categoría "Otro" por defecto
    let finalCategoryId = resolvedCategoryId;
    if (isDraft && !resolvedCategoryId) {
      const defaultCategory = await prisma.businessCategory.findFirst({
        where: { OR: [{ slug: 'otro' }, { slug: 'other' }, { name: 'Otro' }] }
      });
      if (defaultCategory) {
        finalCategoryId = defaultCategory.id;
      } else {
        // Crear categoría por defecto si no existe
        const newCategory = await prisma.businessCategory.create({
          data: { name: 'Otro', slug: 'otro', icon: '✨', description: 'Otros servicios' }
        });
        finalCategoryId = newCategory.id;
      }
    }

    const profile = await prisma.businessProfile.create({
      data: {
        userId,
        organizationId: user.organizationId,
        visionId: enrollment?.visionId,
        headline,
        categoryId: finalCategoryId,
        description: description || 'Perfil en construcción - completar información.',
        discountOffer: discountOffer || 'Por definir',
        city: city || 'Por definir',
        state: state || 'Por definir',
        coverageZone,
        whatsappPhone: whatsappPhone || user.telefono || '',
        email: email || user.email,
        website,
        galleryImages: galleryImages || [],
        logoUrl,
        isPLGraduate: !!graduation,
        isVerified: !!graduation, // Tick azul automático si graduó de PL
        status: isDraft ? 'HIDDEN' : 'ACTIVE', // Borrador = HIDDEN
        updatedAt: new Date(),
      },
      include: {
        BusinessCategory: true,
      }
    });

    // Mapear para compatibilidad con frontend
    const profileWithCategory = {
      ...profile,
      category: profile.BusinessCategory
    };

    return NextResponse.json({ profile: profileWithCategory }, { status: 201 });
  } catch (error: any) {
    logger.error('Error creating profile:', error);
    console.error('❌ Error detallado creando perfil:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Error al crear perfil: ' + (error?.message || 'desconocido') }, { status: 500 });
  }
}

// PATCH - Actualizar mi perfil de negocio
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const existingProfile = await prisma.businessProfile.findUnique({
      where: { userId }
    });

    if (!existingProfile) {
      return NextResponse.json({ error: 'No tienes un perfil de negocio' }, { status: 404 });
    }

    // No permitir editar si está baneado
    if (existingProfile.status === 'BANNED') {
      return NextResponse.json({ 
        error: 'Tu perfil ha sido suspendido por múltiples reseñas negativas' 
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      headline,
      categoryId,
      categorySlug, // Nuevo: aceptar slug de categoría
      description,
      discountOffer,
      city,
      state,
      coverageZone,
      whatsappPhone,
      email,
      website,
      galleryImages,
      logoUrl,
      status // Solo permite ACTIVE o HIDDEN
    } = body;

    // Construir objeto de actualización
    const updateData: Record<string, unknown> = {};

    if (headline !== undefined) {
      if (headline.length > 100) {
        return NextResponse.json({ error: 'El titular no puede exceder 100 caracteres' }, { status: 400 });
      }
      updateData.headline = headline;
    }
    
    // Resolver categoryId: preferir categoryId directo, sino buscar por slug
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    } else if (categorySlug !== undefined && categorySlug !== '') {
      // Buscar la categoría por slug
      const category = await prisma.businessCategory.findFirst({
        where: { 
          OR: [
            { slug: categorySlug },
            { slug: categorySlug.toLowerCase() },
            // También buscar por nombre similar
            { name: { contains: categorySlug, mode: 'insensitive' } }
          ]
        }
      });
      if (category) {
        updateData.categoryId = category.id;
      }
    }
    
    if (description !== undefined) updateData.description = description;
    if (discountOffer !== undefined) updateData.discountOffer = discountOffer;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (coverageZone !== undefined) updateData.coverageZone = coverageZone;
    if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (galleryImages !== undefined) {
      if (Array.isArray(galleryImages) && galleryImages.length > 5) {
        return NextResponse.json({ error: 'Máximo 5 imágenes en la galería' }, { status: 400 });
      }
      updateData.galleryImages = galleryImages;
    }
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    
    // Solo permitir cambiar entre ACTIVE y HIDDEN
    if (status !== undefined && ['ACTIVE', 'HIDDEN'].includes(status)) {
      updateData.status = status;
    }

    const profile = await prisma.businessProfile.update({
      where: { userId },
      data: updateData,
      include: {
        BusinessCategory: true,
      }
    });

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}
