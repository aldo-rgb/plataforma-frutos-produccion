import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Buscar perfiles en el directorio
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Verificar que el usuario pertenece a una organización
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ 
        error: 'Debes pertenecer a una organización para acceder al directorio' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('category');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const sortBy = searchParams.get('sort') || 'rating'; // rating, recent, verified
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const onlyVerified = searchParams.get('verified') === 'true';
    const onlyWithDiscount = searchParams.get('discount') === 'true';
    const section = searchParams.get('section') || 'public'; // 'public' (ACTIVE) o 'expo' (HIDDEN)
    const visionId = searchParams.get('visionId'); // Filtro por visión para Expo

    logger.debug(`[talent-directory] section=${section}, visionId=${visionId}, userOrgId=${user.organizationId}`);

    // Construir filtros
    // ACTIVE = Directorio de Servicios (público, TODAS las organizaciones)
    // HIDDEN o ACTIVE = Expo de Futuros (todos los negocios de la visión)
    const where: Record<string, unknown> = {};

    // Expo de Futuros: mostrar TODOS los negocios de la VISIÓN seleccionada (HIDDEN y ACTIVE)
    // Directorio de Servicios: solo ACTIVE de todas las organizaciones
    if (section === 'expo') {
      // En Expo mostramos todos los negocios (sin importar status)
      where.status = { in: ['HIDDEN', 'ACTIVE'] };
      
      // Filtrar por visión (NO por organización, ya que una expo puede tener gente de diferentes orgs)
      if (visionId) {
        where.visionId = parseInt(visionId);
        logger.debug(`[talent-directory] Filtering by visionId=${visionId}`);
      }
      // Si no hay visionId, mostrar todos los de la organización del usuario como fallback
      else {
        where.organizationId = user.organizationId;
        logger.debug(`[talent-directory] No visionId, using orgId=${user.organizationId}`);
      }
    } else {
      // Directorio de Servicios: solo perfiles publicados
      where.status = 'ACTIVE';
    }

    logger.debug(`[talent-directory] where=${JSON.stringify(where)}`);

    // Búsqueda por texto (debe combinarse con filtros existentes)
    if (query) {
      // Si ya hay OR por visión, necesitamos estructurar diferente
      const textFilter = {
        OR: [
          { headline: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { user: { nombre: { contains: query, mode: 'insensitive' } } },
        ]
      };
      
      if (where.OR) {
        // Ya hay filtros OR, combinarlos con AND
        where.AND = [{ OR: where.OR }, textFilter];
        delete where.OR;
      } else {
        where.OR = textFilter.OR;
      }
    }

    // Filtro por categoría
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    // Filtro por ubicación
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    // Filtro solo verificados (graduados PL)
    if (onlyVerified) {
      where.isVerified = true;
    }

    // Filtro con descuento (todos tienen, pero por si acaso)
    if (onlyWithDiscount) {
      where.discountOffer = { not: '' };
    }

    // Definir ordenamiento
    let orderBy: Record<string, unknown>[] = [];
    switch (sortBy) {
      case 'rating':
        orderBy = [
          { avgRating: 'desc' },
          { totalReviews: 'desc' },
          { isVerified: 'desc' },
        ];
        break;
      case 'recent':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'verified':
        orderBy = [
          { isVerified: 'desc' },
          { isPLGraduate: 'desc' },
          { avgRating: 'desc' },
        ];
        break;
      case 'reviews':
        orderBy = [{ totalReviews: 'desc' }, { avgRating: 'desc' }];
        break;
      default:
        orderBy = [{ avgRating: 'desc' }];
    }

    // Priorizar perfiles con fotos (añadir al final del ordenamiento)
    // Esto es un poco tricky en Prisma, lo manejamos después

    const [profiles, total] = await Promise.all([
      prisma.businessProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              imagen: true,
              QuantumWebsite: {
                select: {
                  slug: true,
                  isPublished: true
                }
              }
            }
          },
          BusinessCategory: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            }
          },
          Vision: {
            select: {
              id: true,
              nombre: true,
            }
          },
        }
      }),
      prisma.businessProfile.count({ where }),
    ]);

    // Ordenar por completitud (perfiles con fotos primero) - post-process
    type ProfileWithRelations = typeof profiles[number];
    const sortedProfiles = profiles.sort((a: ProfileWithRelations, b: ProfileWithRelations) => {
      const aHasPhotos = (a.galleryImages?.length || 0) > 0 || !!a.logoUrl;
      const bHasPhotos = (b.galleryImages?.length || 0) > 0 || !!b.logoUrl;
      if (aHasPhotos && !bHasPhotos) return -1;
      if (!aHasPhotos && bHasPhotos) return 1;
      return 0;
    });

    // Para la sección expo, obtener los toques del usuario actual
    let userNudges: number[] = [];
    if (section === 'expo') {
      const nudges = await prisma.businessNudge.findMany({
        where: {
          userId,
          profileId: { in: sortedProfiles.map(p => p.id) }
        },
        select: { profileId: true }
      });
      userNudges = nudges.map(n => n.profileId);
    }

    // Transformar para incluir websiteUrl y nudge info
    const profilesWithWebsite = sortedProfiles.map((profile) => {
      const website = profile.Usuario.QuantumWebsite;
      const websiteUrl = website?.isPublished && website?.slug 
        ? `https://quantummatter.app/site/${website.slug}`
        : null;
      
      return {
        ...profile,
        websiteUrl,
        hasNudged: userNudges.includes(profile.id), // Si el usuario ya dio toque
        // Mapear a los nombres que espera el frontend
        user: {
          id: profile.Usuario.id,
          nombre: profile.Usuario.nombre,
          imagen: profile.Usuario.imagen
        },
        category: profile.BusinessCategory,
        vision: profile.Vision
      };
    });

    return NextResponse.json({
      profiles: profilesWithWebsite,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    logger.error('Error searching profiles:', error);
    return NextResponse.json({ error: 'Error al buscar perfiles' }, { status: 500 });
  }
}
