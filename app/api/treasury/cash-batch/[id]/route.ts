import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/treasury/cash-batch/[id]
 * Obtiene detalle completo de un corte de caja
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const cashBatch = await prisma.cashBatch.findUnique({
      where: { id: batchId }, // batchId es string (UUID)
      include: {
        coordinator: {
          select: { id: true, nombre: true, email: true },
        },
        receivedBy: {
          select: { id: true, nombre: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
        paymentCodes: {
          include: {
            redeemedBy: {
              select: { id: true, nombre: true },
            },
          },
          orderBy: { redeemedAt: 'desc' },
        },
        expenses: {
          include: {
            approvedBy: {
              select: { id: true, nombre: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cashBatch) {
      return NextResponse.json(
        { success: false, error: 'Corte de caja no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (user.rol !== 'SCHOOL_ADMIN' && cashBatch.coordinatorId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para ver este corte' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      cashBatch: {
        id: cashBatch.id,
        batchNumber: cashBatch.batchNumber,
        totalCollected: Number(cashBatch.totalCollected),
        totalExpenses: Number(cashBatch.totalExpenses),
        netAmount: Number(cashBatch.netAmount),
        status: cashBatch.status,
        deliveryMethod: cashBatch.deliveryMethod,
        depositProofUrl: cashBatch.depositProofUrl,
        bankReference: cashBatch.bankReference,
        createdAt: cashBatch.createdAt,
        closedAt: cashBatch.closedAt,
        confirmedAt: cashBatch.confirmedAt,
        confirmationCode: cashBatch.confirmationCode,
        confirmationCodeGeneratedAt: cashBatch.confirmationCodeGeneratedAt,
        coordinator: cashBatch.coordinator,
        receivedBy: cashBatch.receivedBy,
        vision: cashBatch.vision,
        paymentCodes: cashBatch.paymentCodes.map((code) => ({
          id: code.id,
          code: code.code,
          amount: Number(code.amount),
          status: code.status,
          redeemedAt: code.redeemedAt,
          redeemedBy: code.redeemedBy,
        })),
        expenses: cashBatch.expenses.map((exp) => ({
          id: exp.id,
          concept: exp.concept,
          amount: Number(exp.amount),
          category: exp.category,
          receiptUrl: exp.receiptUrl,
          status: exp.status,
          createdAt: exp.createdAt,
          approvedBy: exp.approvedBy,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching cash batch:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener corte de caja' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/treasury/cash-batch/[id]
 * Actualiza el método de entrega de un corte
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    const body = await request.json();
    const { deliveryMethod, depositProofUrl, bankReference } = body;

    // Verificar que el batch existe y pertenece al usuario
    const existingBatch = await prisma.cashBatch.findUnique({
      where: { id: batchId }, // batchId es string (UUID)
    });

    if (!existingBatch) {
      return NextResponse.json(
        { success: false, error: 'Corte no encontrado' },
        { status: 404 }
      );
    }

    if (existingBatch.coordinatorId !== user.id && user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    if (existingBatch.status === 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: 'Este corte ya fue confirmado y no puede modificarse' },
        { status: 400 }
      );
    }

    // Actualizar el batch
    const updatedBatch = await prisma.cashBatch.update({
      where: { id: batchId },
      data: {
        deliveryMethod: deliveryMethod || existingBatch.deliveryMethod,
        depositProofUrl: depositProofUrl || existingBatch.depositProofUrl,
        bankReference: bankReference || existingBatch.bankReference,
        status: deliveryMethod ? 'DELIVERED' : existingBatch.status,
        closedAt: deliveryMethod && !existingBatch.closedAt ? new Date() : existingBatch.closedAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Corte de caja actualizado',
      cashBatch: {
        id: updatedBatch.id,
        batchNumber: updatedBatch.batchNumber,
        status: updatedBatch.status,
        deliveryMethod: updatedBatch.deliveryMethod,
      },
    });
  } catch (error) {
    logger.error('Error updating cash batch:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar corte' },
      { status: 500 }
    );
  }
}
