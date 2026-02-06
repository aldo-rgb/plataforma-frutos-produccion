import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function PATCH(
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

    // Verificar que el usuario es SCHOOL_ADMIN
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
        { error: 'No tienes permisos para rechazar perfiles' },
        { status: 403 }
      );
    }

    // Verificar que el líder existe y pertenece a la misma organización
    const lider = await prisma.usuario.findFirst({
      where: {
        id: liderId,
        rol: 'LIDER',
        organizationId: admin.organizationId
      },
      include: {
        PerfilMentor: true
      }
    });

    if (!lider) {
      return NextResponse.json(
        { error: 'Líder no encontrado o no pertenece a tu organización' },
        { status: 404 }
      );
    }

    if (!lider.PerfilMentor) {
      return NextResponse.json(
        { error: 'El líder no tiene perfil de mentor' },
        { status: 400 }
      );
    }

    // Actualizar el estado del perfil a REJECTED
    await prisma.perfilMentor.update({
      where: { id: lider.PerfilMentor.id },
      data: {
        profileApprovalStatus: 'REJECTED'
      }
    });

    // Marcar la notificación como leída
    await prisma.mentorAlert.updateMany({
      where: {
        mentorId: userId,
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

    return NextResponse.json({
      success: true,
      message: 'Perfil rechazado'
    });

  } catch (error) {
    logger.error('❌ Error al rechazar perfil:', error);
    return NextResponse.json(
      { error: 'Error al rechazar el perfil' },
      { status: 500 }
    );
  }
}
