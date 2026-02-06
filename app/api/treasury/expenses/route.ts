import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/treasury/expenses
 * Registra un nuevo gasto operativo
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
        { success: false, error: 'No tienes permisos para registrar gastos' },
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
    const { 
      concept, 
      amount, 
      category, 
      receiptUrl, 
      notes, 
      deductedFromCash = true,
      visionId 
    } = body;

    // Validaciones
    if (!concept || !amount || !category) {
      return NextResponse.json(
        { success: false, error: 'Concepto, monto y categoría son requeridos' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    const validCategories = ['LOGISTICS', 'FOOD', 'VENUE', 'TRANSPORT', 'MARKETING', 'SUPPLIES', 'EQUIPMENT', 'OTHER'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Categoría inválida' },
        { status: 400 }
      );
    }

    // Crear el gasto
    const expense = await prisma.expense.create({
      data: {
        concept,
        amount,
        category,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
        deductedFromCash,
        status: 'PENDING',
        organizationId: user.organizationId,
        visionId: visionId ? parseInt(visionId) : null,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Gasto registrado. Pendiente de aprobación.',
      expense: {
        id: expense.id,
        concept: expense.concept,
        amount: expense.amount,
        category: expense.category,
        status: expense.status,
        deductedFromCash: expense.deductedFromCash,
        createdAt: expense.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar gasto' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/treasury/expenses
 * Lista los gastos
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
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED, ALL
    const coordinatorId = searchParams.get('coordinatorId');
    const visionId = searchParams.get('visionId');
    const category = searchParams.get('category');

    // Construir filtros
    const where: any = {
      organizationId: user.organizationId,
    };

    // Si no es admin, solo ver sus propios gastos
    if (user.rol !== 'SCHOOL_ADMIN') {
      where.userId = user.id;
    } else if (coordinatorId) {
      where.userId = parseInt(coordinatorId);
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    if (category) {
      where.category = category;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: {
          select: { id: true, nombre: true },
        },
        approvedBy: {
          select: { id: true, nombre: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular totales
    const totalPending = expenses
      .filter((e) => e.status === 'PENDING')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalApproved = expenses
      .filter((e) => e.status === 'APPROVED')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRejected = expenses
      .filter((e) => e.status === 'REJECTED')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // Desglose por categoría
    const byCategory: Record<string, number> = {};
    expenses.filter(e => e.status === 'APPROVED').forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });

    return NextResponse.json({
      success: true,
      expenses: expenses.map((expense) => ({
        id: expense.id,
        concept: expense.concept,
        amount: Number(expense.amount),
        category: expense.category,
        receiptUrl: expense.receiptUrl,
        notes: expense.notes,
        status: expense.status,
        deductedFromCash: expense.deductedFromCash,
        createdAt: expense.createdAt,
        approvedAt: expense.approvedAt,
        rejectedAt: expense.rejectedAt,
        rejectionReason: expense.rejectionReason,
        user: expense.user,
        approvedBy: expense.approvedBy,
        vision: expense.vision,
        batchId: expense.batchId,
      })),
      summary: {
        totalPending,
        totalApproved,
        totalRejected,
        byCategory,
        count: expenses.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener gastos' },
      { status: 500 }
    );
  }
}
