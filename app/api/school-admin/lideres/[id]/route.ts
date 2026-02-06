import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/school-admin/lideres/[id]
 * Obtiene los datos completos de un líder específico
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const resolvedParams = await params;
    const liderId = parseInt(resolvedParams.id);

    if (isNaN(liderId)) {
      return NextResponse.json(
        { error: 'ID de líder inválido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea SCHOOL_ADMIN
    const admin = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!admin || admin.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // Obtener datos completos del líder
    const lider = await prisma.usuario.findFirst({
      where: {
        id: liderId,
        rol: 'LIDER',
        organizationId: admin.organizationId
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        profileImage: true,
        isActive: true,
        mentorMarketplaceApproved: true,
        createdAt: true,
        PerfilMentor: {
          select: {
            id: true,
            biografia: true,
            biografiaCorta: true,
            especialidad: true,
            especialidadesSecundarias: true,
            experienciaAnios: true,
            nivel: true,
            tagline: true,
            expertiseTags: true,
            profileApprovalStatus: true,
            profileSubmittedAt: true
          }
        }
      }
    });

    if (!lider) {
      return NextResponse.json(
        { success: false, error: 'Líder no encontrado' },
        { status: 404 }
      );
    }

    // Formatear respuesta
    const liderData = {
      id: lider.id,
      nombre: lider.nombre,
      email: lider.email,
      telefono: lider.telefono,
      profileImage: lider.profileImage,
      isActive: lider.isActive,
      mentorMarketplaceApproved: lider.mentorMarketplaceApproved,
      profileApprovalStatus: lider.PerfilMentor?.profileApprovalStatus || 'DRAFT',
      profileSubmittedAt: lider.PerfilMentor?.profileSubmittedAt?.toISOString() || null,
      perfilMentor: lider.PerfilMentor ? {
        id: lider.PerfilMentor.id,
        biografia: lider.PerfilMentor.biografia,
        biografiaCorta: lider.PerfilMentor.biografiaCorta,
        especialidad: lider.PerfilMentor.especialidad,
        especialidadesSecundarias: lider.PerfilMentor.especialidadesSecundarias,
        experienciaAnios: lider.PerfilMentor.experienciaAnios,
        nivel: lider.PerfilMentor.nivel,
        tagline: lider.PerfilMentor.tagline,
        expertiseTags: lider.PerfilMentor.expertiseTags
      } : null
    };

    return NextResponse.json({
      success: true,
      lider: liderData
    });

  } catch (error) {
    logger.error('Error al obtener líder:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar el líder' },
      { status: 500 }
    );
  }
}
