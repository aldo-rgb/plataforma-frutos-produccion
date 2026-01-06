import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/school-admin/notificaciones/lideres
 * 
 * Obtiene todas las notificaciones de líderes que solicitan aprobación.
 * Solo accesible para SCHOOL_ADMIN y directores de organización.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verificar que el usuario sea SCHOOL_ADMIN o tenga una organización
    const admin = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        rol: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            schoolAdminId: true
          }
        }
      }
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const esSchoolAdmin = admin.rol === 'SCHOOL_ADMIN';
    const esDirector = admin.Organization_Usuario_organizationIdToOrganization?.schoolAdminId === userId;

    console.log(`📊 Usuario ${userId} (${admin.rol}) - esSchoolAdmin: ${esSchoolAdmin}, esDirector: ${esDirector}`);

    if (!esSchoolAdmin && !esDirector) {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo directores y school admins pueden ver estas notificaciones.' },
        { status: 403 }
      );
    }

    // Obtener notificaciones de líderes
    console.log(`🔍 Buscando notificaciones para mentorId: ${userId}`);
    
    const notificaciones = await prisma.mentorAlert.findMany({
      where: {
        mentorId: userId,
        type: 'MILESTONE',
        message: {
          contains: 'solicita aprobación de su perfil de mentor'
        },
        read: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Notificaciones encontradas: ${notificaciones.length}`);

    // Enriquecer con datos del líder
    const notificacionesEnriquecidas = await Promise.all(
      notificaciones.map(async (notif) => {
        // El usuarioId es el líder que solicita aprobación
        const liderId = notif.usuarioId;

        const lider = await prisma.usuario.findUnique({
          where: { id: liderId },
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true,
            mentorMarketplaceApproved: true,
            isActive: true,
            PerfilMentor: {
              select: {
                id: true,
                biografia: true,
                biografiaCorta: true,
                especialidad: true,
                especialidadesSecundarias: true,
                experienciaAnios: true,
                nivel: true
              }
            }
          }
        });

        return {
          id: notif.id,
          mentorId: notif.mentorId,
          usuarioId: notif.usuarioId,
          type: notif.type,
          message: notif.message,
          read: notif.read,
          createdAt: notif.createdAt.toISOString(),
          lider: lider ? {
            id: lider.id,
            nombre: lider.nombre,
            email: lider.email,
            profileImage: lider.profileImage,
            mentorMarketplaceApproved: lider.mentorMarketplaceApproved,
            isActive: lider.isActive,
            perfilMentor: lider.PerfilMentor
          } : null
        };
      })
    );

    return NextResponse.json({
      notificaciones: notificacionesEnriquecidas,
      total: notificacionesEnriquecidas.length
    });

  } catch (error) {
    console.error('Error al obtener notificaciones de líderes:', error);
    return NextResponse.json(
      { error: 'Error al cargar las notificaciones' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/school-admin/notificaciones/lideres
 * 
 * Marca una notificación como leída.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { notificacionId } = await req.json();

    if (!notificacionId) {
      return NextResponse.json(
        { error: 'Se requiere notificacionId' },
        { status: 400 }
      );
    }

    // Verificar que la notificación pertenece al usuario actual
    const notificacion = await prisma.mentorAlert.findUnique({
      where: { id: notificacionId }
    });

    if (!notificacion) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      );
    }

    if (notificacion.mentorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para marcar esta notificación' },
        { status: 403 }
      );
    }

    // Marcar como leída
    await prisma.mentorAlert.update({
      where: { id: notificacionId },
      data: { read: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    console.error('Error al marcar notificación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la notificación' },
      { status: 500 }
    );
  }
}
