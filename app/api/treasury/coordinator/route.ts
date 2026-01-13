import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];

/**
 * GET /api/treasury/coordinator
 * Obtiene el resumen de tesorería del coordinador actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener códigos generados por este coordinador
    const codes = await prisma.paymentCode.findMany({
      where: { createdById: user.id },
      include: {
        vision: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener cortes de caja del coordinador
    const batches = await prisma.cashBatch.findMany({
      where: { coordinatorId: user.id },
      include: {
        _count: { select: { paymentCodes: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener gastos del coordinador
    const expenses = await prisma.expense.findMany({
      where: { userId: user.id },
      include: {
        vision: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular totales
    const totalGenerated = codes.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalRedeemed = codes
      .filter(c => c.status === 'REDEEMED')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const totalPending = codes
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const totalCancelled = codes
      .filter(c => c.status === 'CANCELLED')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    // Caja Chica = Total generado - Cancelados (lo que realmente está en juego)
    const cajaChica = totalGenerated - totalCancelled;

    // Calcular deuda pendiente (canjeados no entregados)
    const confirmedBatchAmount = batches
      .filter(b => b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + Number(b.netAmount), 0);
    const pendingDebt = totalRedeemed - confirmedBatchAmount;

    // Calcular gastos
    const totalExpensesPending = expenses
      .filter(e => e.status === 'PENDING')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpensesApproved = expenses
      .filter(e => e.status === 'APPROVED')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      success: true,
      totalGenerated,
      totalRedeemed,
      totalPending,
      totalCancelled,
      cajaChica,
      pendingDebt: Math.max(0, pendingDebt),
      totalExpensesPending,
      totalExpensesApproved,
      codes: codes.map(c => ({
        id: c.id,
        code: c.code,
        amount: Number(c.amount),
        reference: c.reference,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        redeemedAt: c.redeemedAt?.toISOString() || null,
        cancelledAt: c.cancelledAt?.toISOString() || null,
        cancellationReason: c.cancellationReason || null,
        vision: c.vision
      })),
      batches: batches.map(b => ({
        id: b.id,
        batchNumber: b.batchNumber,
        amount: Number(b.netAmount),
        totalCollected: Number(b.totalCollected),
        totalExpenses: Number(b.totalExpenses),
        codesCount: b._count.paymentCodes,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        confirmedAt: b.confirmedAt?.toISOString() || null,
        notes: null
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        concept: e.concept,
        amount: Number(e.amount),
        category: e.category,
        status: e.status,
        receiptUrl: e.receiptUrl,
        notes: e.notes,
        createdAt: e.createdAt.toISOString(),
        vision: e.vision
      }))
    });

  } catch (error: any) {
    console.error('Error fetching coordinator treasury:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener tesorería' },
      { status: 500 }
    );
  }
}
