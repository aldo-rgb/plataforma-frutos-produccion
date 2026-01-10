import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/treasury/payment-codes/cancel
 * Cancela un código de pago activo
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { codeId, code } = body;

    // Buscar el código
    const paymentCode = await prisma.paymentCode.findFirst({
      where: {
        OR: [
          { id: codeId },
          { code: code?.toUpperCase().trim() },
        ],
        organizationId: user.organizationId,
      },
    });

    if (!paymentCode) {
      return NextResponse.json(
        { success: false, error: 'Código no encontrado' },
        { status: 404 }
      );
    }

    // Solo el creador o admin puede cancelar
    if (user.rol !== 'SCHOOL_ADMIN' && paymentCode.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Solo el creador del código o un admin puede cancelarlo' },
        { status: 403 }
      );
    }

    if (paymentCode.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden cancelar códigos activos' },
        { status: 400 }
      );
    }

    // Cancelar el código
    await prisma.paymentCode.update({
      where: { id: paymentCode.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Código cancelado exitosamente',
    });
  } catch (error) {
    console.error('Error cancelling payment code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cancelar código' },
      { status: 500 }
    );
  }
}
