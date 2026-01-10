import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/treasury/payment-codes/redeem
 * Canjea un código de pago en efectivo (para usar en checkout)
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

    const body = await request.json();
    const { code, userId } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código requerido' },
        { status: 400 }
      );
    }

    // Buscar el código
    const paymentCode = await prisma.paymentCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        vision: { select: { id: true, nombre: true } },
      },
    });

    if (!paymentCode) {
      return NextResponse.json(
        { success: false, error: 'Código no encontrado' },
        { status: 404 }
      );
    }

    if (paymentCode.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        REDEEMED: 'Este código ya fue utilizado',
        CANCELLED: 'Este código fue cancelado',
        EXPIRED: 'Este código ha expirado',
      };
      return NextResponse.json(
        { success: false, error: statusMessages[paymentCode.status] || 'Código no disponible' },
        { status: 400 }
      );
    }

    // Si se proporciona userId, marcar como canjeado inmediatamente
    if (userId) {
      const updatedCode = await prisma.paymentCode.update({
        where: { id: paymentCode.id },
        data: {
          status: 'REDEEMED',
          redeemedById: parseInt(userId),
          redeemedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Código canjeado por $${Number(paymentCode.amount).toLocaleString()} MXN`,
        paymentCode: {
          id: updatedCode.id,
          code: updatedCode.code,
          amount: Number(updatedCode.amount),
          type: 'CASH',
          status: 'REDEEMED',
        },
      });
    }

    // Si no hay userId, solo validar (para preview en checkout)
    return NextResponse.json({
      success: true,
      message: `Código válido por $${Number(paymentCode.amount).toLocaleString()} MXN`,
      paymentCode: {
        id: paymentCode.id,
        code: paymentCode.code,
        amount: Number(paymentCode.amount),
        type: 'CASH',
        status: 'ACTIVE',
        vision: paymentCode.vision,
      },
    });
  } catch (error) {
    console.error('Error redeeming payment code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar código' },
      { status: 500 }
    );
  }
}
