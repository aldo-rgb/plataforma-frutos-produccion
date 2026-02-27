import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
      select: { 
        id: true, 
        rol: true, 
        organizationId: true,
        esCoordinador: true,
        esCoordinadorBasico: true,
        esCoordinadorAvanzado: true,
        esEntrenador: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Validar que el usuario tenga permisos de coordinador
    const hasCoordinatorAccess = 
      user.rol === 'COORDINADOR' || 
      user.rol === 'SCHOOL_ADMIN' ||
      user.rol === 'ADMIN' ||
      user.esCoordinador ||
      user.esCoordinadorBasico ||
      user.esCoordinadorAvanzado ||
      user.esEntrenador;

    if (!hasCoordinatorAccess) {
      logger.warn(`⛔ Usuario ${user.id} (rol: ${user.rol}) intentó acceder a tesorería sin permisos`);
      return NextResponse.json({ error: 'No tienes permisos para acceder a esta sección' }, { status: 403 });
    }

    // Obtener códigos generados por este coordinador (solo los que NO han sido procesados en un corte)
    const codes = await prisma.paymentCode.findMany({
      where: { 
        createdById: user.id,
        batchId: null // Solo códigos sin procesar
      },
      include: {
        vision: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener cortes de caja del coordinador con detalle de códigos y gastos
    const batches = await prisma.cashBatch.findMany({
      where: { coordinatorId: user.id },
      include: {
        _count: { select: { paymentCodes: true, expenses: true } },
        paymentCodes: {
          select: {
            id: true,
            code: true,
            amount: true,
            reference: true,
            status: true
          }
        },
        expenses: {
          select: {
            id: true,
            concept: true,
            amount: true,
            category: true,
            receiptUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener gastos del coordinador (solo los que NO han sido procesados en un corte)
    const expenses = await prisma.expense.findMany({
      where: { 
        userId: user.id,
        batchId: null // Solo gastos sin procesar
      },
      include: {
        vision: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular totales - EXCLUIR cancelados del total generado
    const activeCodes = codes.filter(c => c.status !== 'CANCELLED');
    const totalGenerated = activeCodes.reduce((sum, c) => sum + Number(c.amount), 0);
    const codesCount = activeCodes.length;
    
    const totalRedeemed = codes
      .filter(c => c.status === 'REDEEMED')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const totalPending = codes
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const totalCancelled = codes
      .filter(c => c.status === 'CANCELLED')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    // Caja Chica = Total generado (ya excluye cancelados)
    const cajaChica = totalGenerated;

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
      codesCount, // Cantidad de códigos activos (no cancelados)
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
        batchId: c.batchId || null,
        vision: c.vision
      })),
      batches: batches.map(b => ({
        id: b.id,
        batchNumber: b.batchNumber,
        amount: Number(b.netAmount),
        totalCollected: Number(b.totalCollected),
        totalExpenses: Number(b.totalExpenses),
        codesCount: b._count.paymentCodes,
        expensesCount: b._count.expenses,
        status: b.status,
        hasConfirmationCode: !!b.confirmationCode,
        createdAt: b.createdAt.toISOString(),
        confirmedAt: b.confirmedAt?.toISOString() || null,
        notes: null,
        paymentCodes: b.paymentCodes.map(pc => ({
          id: pc.id,
          code: pc.code,
          amount: Number(pc.amount),
          reference: pc.reference,
          status: pc.status
        })),
        expenses: b.expenses.map(ex => ({
          id: ex.id,
          concept: ex.concept,
          amount: Number(ex.amount),
          category: ex.category,
          receiptUrl: ex.receiptUrl
        }))
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
        batchId: e.batchId || null,
        vision: e.vision
      }))
    });

  } catch (error: any) {
    logger.error('Error fetching coordinator treasury:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener tesorería' },
      { status: 500 }
    );
  }
}
