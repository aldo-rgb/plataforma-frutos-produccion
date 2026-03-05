import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/treasury/director/batches-history
 * Historial completo de cortes de caja para el director
 * Incluye: Todos los estados, filtros por fecha y coordinador
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

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo el director puede ver el historial' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING_DELIVERY, CONFIRMED, ALL
    const coordinatorId = searchParams.get('coordinatorId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const where: any = {
      organizationId: user.organizationId,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (coordinatorId) {
      where.coordinatorId = parseInt(coordinatorId);
    }

    // Obtener cortes con paginación
    const [batches, totalCount] = await Promise.all([
      prisma.cashBatch.findMany({
        where,
        include: {
          Usuario_CashBatch_coordinatorIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              profileImage: true,
            },
          },
          Usuario_CashBatch_confirmedByIdToUsuario: {
            select: {
              id: true,
              nombre: true,
            },
          },
          PaymentCode: {
            select: {
              id: true,
              code: true,
              amount: true,
              status: true,
              reference: true,
            },
          },
          Expense: {
            select: {
              id: true,
              concept: true,
              amount: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.cashBatch.count({ where }),
    ]);

    // Calcular estadísticas
    const stats = await prisma.cashBatch.aggregate({
      where: { organizationId: user.organizationId },
      _sum: {
        totalCollected: true,
        totalExpenses: true,
        netAmount: true,
      },
      _count: true,
    });

    const confirmedStats = await prisma.cashBatch.aggregate({
      where: {
        organizationId: user.organizationId,
        status: 'CONFIRMED',
      },
      _sum: {
        netAmount: true,
      },
      _count: true,
    });

    const pendingStats = await prisma.cashBatch.aggregate({
      where: {
        organizationId: user.organizationId,
        status: { not: 'CONFIRMED' },
      },
      _sum: {
        netAmount: true,
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      batches: batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        totalCollected: Number(b.totalCollected),
        totalExpenses: Number(b.totalExpenses),
        netAmount: Number(b.netAmount),
        status: b.status,
        confirmationCode: b.confirmationCode,
        createdAt: b.createdAt.toISOString(),
        confirmedAt: b.confirmedAt?.toISOString() || null,
        coordinator: b.Usuario_CashBatch_coordinatorIdToUsuario,
        confirmedBy: b.Usuario_CashBatch_confirmedByIdToUsuario,
        codesCount: b.PaymentCode.length,
        expensesCount: b.Expense.length,
        paymentCodes: b.PaymentCode.map((c) => ({
          code: c.code,
          amount: Number(c.amount),
          status: c.status,
          reference: c.reference,
        })),
        expenses: b.Expense.map((e) => ({
          concept: e.concept,
          amount: Number(e.amount),
          category: e.category,
        })),
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      summary: {
        totalBatches: stats._count,
        totalCollected: Number(stats._sum.totalCollected) || 0,
        totalExpenses: Number(stats._sum.totalExpenses) || 0,
        totalNet: Number(stats._sum.netAmount) || 0,
        confirmedBatches: confirmedStats._count,
        confirmedAmount: Number(confirmedStats._sum.netAmount) || 0,
        pendingBatches: pendingStats._count,
        pendingAmount: Number(pendingStats._sum.netAmount) || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching batches history:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener historial de cortes' },
      { status: 500 }
    );
  }
}
