import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener perfil público por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { id } = await params;
    const profileId = parseInt(id);

    // Verificar que el usuario pertenece a una organización
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ 
        error: 'Debes pertenecer a una organización para ver perfiles' 
      }, { status: 403 });
    }

    const profile = await prisma.businessProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
          }
        },
        category: true,
        organization: {
          select: { id: true, name: true }
        },
        vision: {
          select: { id: true, nombre: true }
        },
        reviews: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            author: {
              select: { id: true, nombre: true, imagen: true }
            }
          }
        },
        _count: {
          select: { reviews: true }
        }
      }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Verificar que el perfil es de la misma organización
    if (profile.organizationId !== user.organizationId) {
      return NextResponse.json({ 
        error: 'No puedes ver perfiles de otras organizaciones' 
      }, { status: 403 });
    }

    // Verificar si el usuario actual ya escribió una reseña
    const existingReview = await prisma.serviceReview.findUnique({
      where: {
        profileId_authorId: {
          profileId,
          authorId: userId
        }
      }
    });

    return NextResponse.json({ 
      profile,
      canReview: !existingReview && profile.userId !== userId,
      hasReviewed: !!existingReview
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}
