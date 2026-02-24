import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No hay organización asociada' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { orderId, code } = body;

    if (!orderId || !code) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Buscar la orden pendiente
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    if (order.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Orden no pertenece a tu organización' },
        { status: 403 }
      );
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Esta orden ya fue procesada' },
        { status: 400 }
      );
    }

    // Buscar el código de licencias
    const licenseCode = await prisma.licenseCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!licenseCode) {
      return NextResponse.json(
        { success: false, error: 'Código no válido' },
        { status: 400 }
      );
    }

    if (licenseCode.used) {
      return NextResponse.json(
        { success: false, error: 'Este código ya fue utilizado' },
        { status: 400 }
      );
    }

    if (licenseCode.expiresAt && new Date(licenseCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este código ha expirado' },
        { status: 400 }
      );
    }

    // El código es válido, procesar el canje en una transacción
    await prisma.$transaction(async (tx) => {
      // Marcar el código como usado
      await tx.licenseCode.update({
        where: { id: licenseCode.id },
        data: {
          used: true,
          usedBy: user.id,
          usedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Actualizar la orden como pagada
      await tx.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentMethod: 'code',
          paidAt: new Date(),
          updatedAt: new Date(),
          paymentData: {
            ...(order.paymentData as object || {}),
            codeUsed: code,
            codeId: licenseCode.id,
          },
        },
      });

      // Agregar créditos a la organización
      const existingCredit = await tx.schoolCredit.findUnique({
        where: { organizationId: user.organizationId! },
      });

      if (existingCredit) {
        await tx.schoolCredit.update({
          where: { organizationId: user.organizationId! },
          data: {
            availableCredits: { increment: order.quantity },
            totalCredits: { increment: order.quantity },
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.schoolCredit.create({
          data: {
            organizationId: user.organizationId!,
            availableCredits: order.quantity,
            totalCredits: order.quantity,
            usedCredits: 0,
          },
        });
      }

      // Marcar la orden como créditos generados
      await tx.licenseOrder.update({
        where: { id: orderId },
        data: {
          creditsGenerated: true,
          creditsGeneratedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    logger.debug('✅ Código canjeado exitosamente:', {
      orderId,
      code,
      quantity: order.quantity,
      organization: user.organizationId,
    });

    return NextResponse.json({
      success: true,
      message: 'Código canjeado exitosamente',
      licensesAdded: order.quantity,
    });
  } catch (error) {
    logger.error('Error al canjear código:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar el código',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
