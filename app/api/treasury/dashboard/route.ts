import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * GET /api/treasury/dashboard
 * Dashboard financiero con métricas de P&L
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
    const period = searchParams.get('period') || 'month'; // week, month, year
    const visionId = searchParams.get('visionId');
    const coordinatorId = searchParams.get('coordinatorId');

    // Calcular fechas según el período
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filtros base
    const baseWhere: any = {
      organizationId: user.organizationId,
      createdAt: { gte: startDate },
    };

    // Si no es admin, solo ver sus propios datos
    if (user.rol !== 'SCHOOL_ADMIN') {
      baseWhere.createdById = user.id;
    } else if (coordinatorId) {
      baseWhere.createdById = parseInt(coordinatorId);
    }

    if (visionId) {
      baseWhere.visionId = parseInt(visionId);
    }

    // Métricas de códigos de pago
    const paymentCodes = await prisma.paymentCode.findMany({
      where: {
        ...baseWhere,
        status: { in: ['REDEEMED', 'ACTIVE'] },
      },
      select: {
        amount: true,
        status: true,
        createdAt: true,
        redeemedAt: true,
      },
    });

    // Métricas de gastos
    const expenseWhere: any = {
      organizationId: user.organizationId,
      createdAt: { gte: startDate },
    };
    
    if (user.rol !== 'SCHOOL_ADMIN') {
      expenseWhere.userId = user.id;
    } else if (coordinatorId) {
      expenseWhere.userId = parseInt(coordinatorId);
    }

    if (visionId) {
      expenseWhere.visionId = parseInt(visionId);
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      select: {
        amount: true,
        category: true,
        status: true,
        deductedFromCash: true,
        createdAt: true,
      },
    });

    // Métricas de cortes de caja
    const batchWhere: any = {
      organizationId: user.organizationId,
      createdAt: { gte: startDate },
    };

    if (user.rol !== 'SCHOOL_ADMIN') {
      batchWhere.coordinatorId = user.id;
    } else if (coordinatorId) {
      batchWhere.coordinatorId = parseInt(coordinatorId);
    }

    const cashBatches = await prisma.cashBatch.findMany({
      where: batchWhere,
      select: {
        netAmount: true,
        totalCollected: true,
        totalExpenses: true,
        status: true,
        createdAt: true,
      },
    });

    // Calcular totales
    const totalCollected = paymentCodes
      .filter((c) => c.status === 'REDEEMED')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const pendingCollection = paymentCodes
      .filter((c) => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const totalExpenses = expenses
      .filter((e) => e.status === 'APPROVED')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const pendingExpenses = expenses
      .filter((e) => e.status === 'PENDING')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const cashExpenses = expenses
      .filter((e) => e.status === 'APPROVED' && e.deductedFromCash)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const netProfit = totalCollected - totalExpenses;

    // Deuda pendiente (dinero en manos de coordinadores)
    const pendingDebt = cashBatches
      .filter((b) => b.status !== 'CONFIRMED')
      .reduce((sum, b) => sum + Number(b.netAmount), 0);

    const confirmedCash = cashBatches
      .filter((b) => b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + Number(b.netAmount), 0);

    // Gastos por categoría
    const expensesByCategory: Record<string, number> = {};
    expenses
      .filter((e) => e.status === 'APPROVED')
      .forEach((e) => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
      });

    // Serie temporal (últimos 7 días o semanas según período)
    const timeSeries: { date: string; income: number; expenses: number }[] = [];
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 12;

    for (let i = days - 1; i >= 0; i--) {
      let date: Date;
      let label: string;

      if (period === 'year') {
        date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        label = date.toLocaleDateString('es-MX', { month: 'short' });
      } else {
        date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        label = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      }

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayIncome = paymentCodes
        .filter((c) => {
          const d = c.redeemedAt ? new Date(c.redeemedAt) : null;
          return d && d >= dayStart && d <= dayEnd && c.status === 'REDEEMED';
        })
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const dayExpenses = expenses
        .filter((e) => {
          const d = new Date(e.createdAt);
          return d >= dayStart && d <= dayEnd && e.status === 'APPROVED';
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      timeSeries.push({
        date: label,
        income: dayIncome,
        expenses: dayExpenses,
      });
    }

    // Top coordinadores (solo para admin)
    let topCoordinators: any[] = [];
    if (user.rol === 'SCHOOL_ADMIN') {
      const coordinatorStats = await prisma.paymentCode.groupBy({
        by: ['createdById'],
        where: {
          organizationId: user.organizationId,
          status: 'REDEEMED',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      });

      const coordinatorIds = coordinatorStats.map((s) => s.createdById);
      const coordinators = await prisma.usuario.findMany({
        where: { id: { in: coordinatorIds } },
        select: { id: true, nombre: true },
      });

      topCoordinators = coordinatorStats.map((stat) => ({
        coordinator: coordinators.find((c) => c.id === stat.createdById),
        totalCollected: Number(stat._sum.amount) || 0,
        codesCount: stat._count,
      }));
    }

    return NextResponse.json({
      success: true,
      dashboard: {
        period,
        summary: {
          totalCollected,
          pendingCollection,
          totalExpenses,
          pendingExpenses,
          cashExpenses,
          netProfit,
          profitMargin: totalCollected > 0 ? ((netProfit / totalCollected) * 100).toFixed(1) : 0,
        },
        cashFlow: {
          pendingDebt,
          confirmedCash,
          totalBatches: cashBatches.length,
          pendingBatches: cashBatches.filter((b) => b.status !== 'CONFIRMED').length,
        },
        expensesByCategory,
        timeSeries,
        topCoordinators,
        totals: {
          codesGenerated: paymentCodes.length,
          codesRedeemed: paymentCodes.filter((c) => c.status === 'REDEEMED').length,
          expensesApproved: expenses.filter((e) => e.status === 'APPROVED').length,
          expensesPending: expenses.filter((e) => e.status === 'PENDING').length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching treasury dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener dashboard' },
      { status: 500 }
    );
  }
}
