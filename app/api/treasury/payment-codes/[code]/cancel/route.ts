import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];

/**
 * POST /api/treasury/payment-codes/[code]/cancel
 * Cancela un código de pago
 * 
 * Requisitos:
 * - Solo se puede cancelar dentro de las primeras 24 horas
 * - El código no debe haber sido utilizado (status ACTIVE)
 * - Solo el creador o un admin puede cancelar
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para cancelar códigos' },
        { status: 403 }
      );
    }

    // Buscar el código de pago
    const paymentCode = await prisma.paymentCode.findUnique({
      where: { code },
      include: {
        createdBy: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (!paymentCode) {
      return NextResponse.json(
        { success: false, error: 'Código no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea el creador o un admin de la misma organización
    const isCreator = paymentCode.createdById === user.id;
    const isOrgAdmin = user.rol === 'SCHOOL_ADMIN' && paymentCode.organizationId === user.organizationId;

    if (!isCreator && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Solo puedes cancelar códigos que hayas creado' },
        { status: 403 }
      );
    }

    // Verificar que el código no haya sido utilizado
    if (paymentCode.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        'REDEEMED': 'Este código ya fue utilizado y no puede cancelarse',
        'CANCELLED': 'Este código ya fue cancelado',
        'EXPIRED': 'Este código ya expiró'
      };
      return NextResponse.json(
        { success: false, error: statusMessages[paymentCode.status] || 'El código no puede cancelarse' },
        { status: 400 }
      );
    }

    // Verificar que esté dentro de las 24 horas
    const createdAt = new Date(paymentCode.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return NextResponse.json(
        { success: false, error: 'Solo se puede cancelar dentro de las primeras 24 horas' },
        { status: 400 }
      );
    }

    // Cancelar el código
    const updatedCode = await prisma.paymentCode.update({
      where: { code },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Código cancelado correctamente',
      code: {
        id: updatedCode.id,
        code: updatedCode.code,
        amount: Number(updatedCode.amount),
        status: updatedCode.status,
        cancelledAt: updatedCode.cancelledAt?.toISOString(),
        cancellationReason: updatedCode.cancellationReason
      }
    });

  } catch (error: any) {
    console.error('Error cancelling payment code:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al cancelar código' },
      { status: 500 }
    );
  }
}
