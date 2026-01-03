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
        OrganizacionesCreadas: {
          select: { id: true }
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
    const esDirector = admin.OrganizacionesCreadas && admin.OrganizacionesCreadas.length > 0;

    if (!esSchoolAdmin && !esDirector) {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo directores y school admins pueden ver estas notificaciones.' },
        { status: 403 }
      );
    }

    // Obtener notificaciones de líderes
    const notificaciones = await prisma.mentorAlert.findMany({
      where: {
        mentorId: userId,
        type: 'lider_solicita_aprobacion',
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Enriquecer con datos del líder
    const notificacionesEnriquecidas = await Promise.all(
      notificaciones.map(async (notif) => {
        const metadata = notif.metadata as any;
        const liderId = metadata?.liderId;

        if (!liderId) return notif;

        const lider = await prisma.usuario.findUnique({
          where: { id: liderId },
          select: {
            id: true,
            nombre: true,
            email: true,
            fotoPerfil: true,
            mentorMarketplaceApproved: true,
            isActive: true,
            PerfilMentor: {
              select: {
                bio: true,
                especialidades: true,
                experiencia: true
              }
            }
          }
        });

        return {
          ...notif,
          lider
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
      data: { isRead: true }
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
