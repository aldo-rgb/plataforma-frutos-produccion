import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/admin/trainer-applications/[id]/reject
 * Rechaza una aplicación de trainer
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos
    const adminUser = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) }
    });

    if (!adminUser || !['ADMIN', 'DIRECTOR', 'ADMINISTRADOR', 'SCHOOL_ADMIN'].includes(adminUser.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Debes proporcionar un motivo de rechazo' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const applicationId = parseInt(resolvedParams.id);

    // Obtener la aplicación
    const application = await prisma.trainerApplication.findUnique({
      where: { id: applicationId },
      include: {
        Usuario_TrainerApplication_usuarioIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'La aplicación ya fue procesada' },
        { status: 400 }
      );
    }

    // Actualizar aplicación como rechazada
    await prisma.trainerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date()
      }
    });

    // TODO: Enviar email de rechazo con el motivo

    return NextResponse.json({
      success: true,
      message: 'Aplicación rechazada'
    });

  } catch (error) {
    logger.error('Error rejecting trainer application:', error);
    return NextResponse.json(
      { error: 'Error al rechazar aplicación' },
      { status: 500 }
    );
  }
}
