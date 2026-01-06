import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/mentor-applications/[id]/reject
 * Rechaza una aplicación de mentor
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

    if (!adminUser || !['ADMIN', 'DIRECTOR', 'ADMINISTRADOR'].includes(adminUser.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const { reason } = await req.json();

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Debes proporcionar una razón de rechazo (mínimo 10 caracteres)' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const applicationId = parseInt(resolvedParams.id);

    // Obtener la aplicación
    const application = await prisma.mentorApplication.findUnique({
      where: { id: applicationId }
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

    // Actualizar aplicación
    await prisma.mentorApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
        rejectionReason: reason
      }
    });

    // TODO: Enviar email de rechazo con feedback

    return NextResponse.json({
      success: true,
      message: 'Aplicación rechazada'
    });

  } catch (error) {
    console.error('Error rejecting application:', error);
    return NextResponse.json(
      { error: 'Error al rechazar aplicación' },
      { status: 500 }
    );
  }
}
