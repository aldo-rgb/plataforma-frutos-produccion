import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/treasury/cash-batch
 * Crea un nuevo corte de caja
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
      select: { id: true, rol: true, organizationId: true, nombre: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { visionId, deliveryMethod, depositProofUrl, bankReference } = body;

    // Obtener códigos activos sin corte asignado del coordinador
    const paymentCodes = await prisma.paymentCode.findMany({
      where: {
        createdById: user.id,
        organizationId: user.organizationId,
        status: 'REDEEMED', // Solo los canjeados
        batchId: null, // Sin corte asignado
        ...(visionId && { visionId: parseInt(visionId) }),
      },
    });

    // Obtener gastos aprobados sin corte asignado
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        organizationId: user.organizationId,
        status: 'APPROVED',
        deductedFromCash: true, // Solo los que se pagaron de la caja
        batchId: null,
        ...(visionId && { visionId: parseInt(visionId) }),
      },
    });

    // Calcular totales
    const totalCollected = paymentCodes.reduce((sum, code) => sum + Number(code.amount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const netAmount = totalCollected - totalExpenses;

    if (totalCollected === 0 && totalExpenses === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay movimientos pendientes para este corte' },
        { status: 400 }
      );
    }

    // Generar número de batch
    const year = new Date().getFullYear();
    const batchCount = await prisma.cashBatch.count({
      where: { organizationId: user.organizationId },
    });
    const batchNumber = `BATCH-${year}-${String(batchCount + 1).padStart(3, '0')}`;

    // Crear el corte de caja
    const cashBatch = await prisma.$transaction(async (tx) => {
      // Crear el batch
      const batch = await tx.cashBatch.create({
        data: {
          batchNumber,
          totalCollected,
          totalExpenses,
          netAmount,
          status: deliveryMethod ? 'DELIVERED' : 'PENDING_DELIVERY',
          deliveryMethod: deliveryMethod || 'PENDING',
          depositProofUrl: depositProofUrl || null,
          bankReference: bankReference || null,
          organizationId: user.organizationId!,
          visionId: visionId ? parseInt(visionId) : null,
          coordinatorId: user.id,
          closedAt: deliveryMethod ? new Date() : null,
        },
      });

      // Asociar códigos al batch
      if (paymentCodes.length > 0) {
        await tx.paymentCode.updateMany({
          where: { id: { in: paymentCodes.map((c) => c.id) } },
          data: { batchId: batch.id },
        });
      }

      // Asociar gastos al batch
      if (expenses.length > 0) {
        await tx.expense.updateMany({
          where: { id: { in: expenses.map((e) => e.id) } },
          data: { batchId: batch.id },
        });
      }

      return batch;
    });

    return NextResponse.json({
      success: true,
      message: `Corte de caja ${batchNumber} creado exitosamente`,
      cashBatch: {
        id: cashBatch.id,
        batchNumber: cashBatch.batchNumber,
        totalCollected: Number(cashBatch.totalCollected),
        totalExpenses: Number(cashBatch.totalExpenses),
        netAmount: Number(cashBatch.netAmount),
        status: cashBatch.status,
        deliveryMethod: cashBatch.deliveryMethod,
        codesCount: paymentCodes.length,
        expensesCount: expenses.length,
        createdAt: cashBatch.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating cash batch:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear corte de caja' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/treasury/cash-batch
 * Lista los cortes de caja
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const coordinatorId = searchParams.get('coordinatorId');
    const visionId = searchParams.get('visionId');

    // Construir filtros
    const where: any = {
      organizationId: user.organizationId,
    };

    // Si no es admin, solo ver sus propios cortes
    if (user.rol !== 'SCHOOL_ADMIN') {
      where.coordinatorId = user.id;
    } else if (coordinatorId) {
      where.coordinatorId = parseInt(coordinatorId);
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    const cashBatches = await prisma.cashBatch.findMany({
      where,
      include: {
        coordinator: {
          select: { id: true, nombre: true },
        },
        receivedBy: {
          select: { id: true, nombre: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
        _count: {
          select: {
            paymentCodes: true,
            expenses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular totales pendientes (dinero en manos de coordinadores)
    const pendingDelivery = cashBatches
      .filter((b) => b.status === 'PENDING_DELIVERY' || b.status === 'DELIVERED')
      .reduce((sum, b) => sum + Number(b.netAmount), 0);

    const confirmedTotal = cashBatches
      .filter((b) => b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + Number(b.netAmount), 0);

    return NextResponse.json({
      success: true,
      cashBatches: cashBatches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        totalCollected: Number(batch.totalCollected),
        totalExpenses: Number(batch.totalExpenses),
        netAmount: Number(batch.netAmount),
        status: batch.status,
        deliveryMethod: batch.deliveryMethod,
        depositProofUrl: batch.depositProofUrl,
        bankReference: batch.bankReference,
        createdAt: batch.createdAt,
        closedAt: batch.closedAt,
        confirmedAt: batch.confirmedAt,
        coordinator: batch.coordinator,
        receivedBy: batch.receivedBy,
        vision: batch.vision,
        codesCount: batch._count.paymentCodes,
        expensesCount: batch._count.expenses,
      })),
      summary: {
        pendingDelivery,
        confirmedTotal,
        totalBatches: cashBatches.length,
      },
    });
  } catch (error) {
    console.error('Error fetching cash batches:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener cortes de caja' },
      { status: 500 }
    );
  }
}
