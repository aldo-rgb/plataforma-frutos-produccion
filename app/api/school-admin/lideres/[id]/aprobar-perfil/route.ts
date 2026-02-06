import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * PATCH /api/school-admin/lideres/[id]/aprobar-perfil
 * 
 * Aprueba el perfil de un líder después de revisarlo.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const liderId = parseInt(resolvedParams.id);

    if (isNaN(liderId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que el usuario sea SCHOOL_ADMIN
    const admin = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true
      }
    });

    if (!admin || admin.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar que el líder exista y pertenezca a la misma organización
    const lider = await prisma.usuario.findUnique({
      where: { id: liderId },
      select: {
        id: true,
        nombre: true,
        rol: true,
        organizationId: true,
        PerfilMentor: {
          select: {
            id: true,
            profileApprovalStatus: true
          }
        }
      }
    });

    if (!lider) {
      return NextResponse.json({ error: 'Líder no encontrado' }, { status: 404 });
    }

    if (lider.rol !== 'LIDER') {
      return NextResponse.json({ error: 'El usuario no es un líder' }, { status: 400 });
    }

    if (lider.organizationId !== admin.organizationId) {
      return NextResponse.json({ error: 'El líder no pertenece a tu organización' }, { status: 403 });
    }

    if (!lider.PerfilMentor) {
      return NextResponse.json({ error: 'El líder no tiene un perfil de mentor' }, { status: 400 });
    }

    if (lider.PerfilMentor.profileApprovalStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'El perfil no está pendiente de aprobación' },
        { status: 400 }
      );
    }

    // Actualizar el estado del perfil a APPROVED
    await prisma.perfilMentor.update({
      where: { id: lider.PerfilMentor.id },
      data: {
        profileApprovalStatus: 'APPROVED',
        membershipApprovedAt: new Date(),
        membershipApprovedBy: session.user.id
      }
    });

    // Marcar como leída la notificación de solicitud de aprobación del director
    await prisma.mentorAlert.updateMany({
      where: {
        mentorId: session.user.id,
        usuarioId: liderId,
        type: 'MILESTONE',
        message: {
          contains: 'solicita aprobación de su perfil de mentor'
        },
        read: false
      },
      data: {
        read: true
      }
    });

    // Crear notificación para el líder
    await prisma.mentorAlert.create({
      data: {
        mentorId: liderId,
        usuarioId: session.user.id,
        type: 'MILESTONE',
        message: `¡Tu perfil de mentor ha sido aprobado! Ya puedes acceder al marketplace de mentoría.`,
        read: false
      }
    });

    logger.debug(`✅ Perfil del líder ${lider.nombre} (ID: ${liderId}) aprobado por ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Perfil aprobado exitosamente'
    });

  } catch (error) {
    logger.error('Error aprobando perfil de líder:', error);
    return NextResponse.json(
      { error: 'Error al aprobar perfil' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school-admin/lideres/[id]/aprobar-perfil
 * 
 * Rechaza el perfil de un líder con feedback.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { feedback } = await req.json();
    const liderId = parseInt(params.id);

    if (isNaN(liderId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que el usuario sea SCHOOL_ADMIN
    const admin = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true
      }
    });

    if (!admin || admin.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar que el líder exista y pertenezca a la misma organización
    const lider = await prisma.usuario.findUnique({
      where: { id: liderId },
      select: {
        id: true,
        nombre: true,
        rol: true,
        organizationId: true,
        PerfilMentor: {
          select: {
            id: true,
            profileApprovalStatus: true
          }
        }
      }
    });

    if (!lider) {
      return NextResponse.json({ error: 'Líder no encontrado' }, { status: 404 });
    }

    if (lider.organizationId !== admin.organizationId) {
      return NextResponse.json({ error: 'El líder no pertenece a tu organización' }, { status: 403 });
    }

    if (!lider.PerfilMentor) {
      return NextResponse.json({ error: 'El líder no tiene un perfil de mentor' }, { status: 400 });
    }

    // Actualizar el estado del perfil a REJECTED
    await prisma.perfilMentor.update({
      where: { id: lider.PerfilMentor.id },
      data: {
        profileApprovalStatus: 'REJECTED'
      }
    });

    // Crear notificación para el líder con feedback
    await prisma.mentorAlert.create({
      data: {
        mentorId: liderId,
        usuarioId: session.user.id,
        type: 'ALERT',
        message: `Tu perfil necesita revisión: ${feedback || 'Por favor revisa y actualiza la información de tu perfil.'}`,
        read: false
      }
    });

    logger.debug(`❌ Perfil del líder ${lider.nombre} (ID: ${liderId}) rechazado por ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Perfil rechazado, se ha notificado al líder'
    });

  } catch (error) {
    logger.error('Error rechazando perfil de líder:', error);
    return NextResponse.json(
      { error: 'Error al rechazar perfil' },
      { status: 500 }
    );
  }
}
