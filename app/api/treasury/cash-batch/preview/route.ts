import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/treasury/cash-batch/preview
 * Vista previa del corte de caja antes de crearlo
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

    const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    // Obtener códigos pendientes (redimidos sin batch)
    const paymentCodes = await prisma.paymentCode.findMany({
      where: {
        createdById: user.id,
        organizationId: user.organizationId,
        status: 'REDEEMED',
        batchId: null,
        ...(visionId && { visionId: parseInt(visionId) }),
      },
      include: {
        redeemedBy: {
          select: { id: true, nombre: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { redeemedAt: 'desc' },
    });

    // Obtener gastos aprobados pendientes
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        organizationId: user.organizationId,
        status: 'APPROVED',
        deductedFromCash: true,
        batchId: null,
        ...(visionId && { visionId: parseInt(visionId) }),
      },
      include: {
        vision: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular totales
    const totalCollected = paymentCodes.reduce((sum, code) => sum + Number(code.amount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const netAmount = totalCollected - totalExpenses;

    // Agrupar por visión para el reporte
    const byVision: Record<string, { collected: number; expenses: number; net: number }> = {};
    
    paymentCodes.forEach((code) => {
      const visionName = code.vision?.nombre || 'Sin visión';
      if (!byVision[visionName]) {
        byVision[visionName] = { collected: 0, expenses: 0, net: 0 };
      }
      byVision[visionName].collected += Number(code.amount);
    });

    expenses.forEach((exp) => {
      const visionName = exp.vision?.nombre || 'Sin visión';
      if (!byVision[visionName]) {
        byVision[visionName] = { collected: 0, expenses: 0, net: 0 };
      }
      byVision[visionName].expenses += Number(exp.amount);
    });

    Object.keys(byVision).forEach((key) => {
      byVision[key].net = byVision[key].collected - byVision[key].expenses;
    });

    return NextResponse.json({
      success: true,
      preview: {
        totalCollected,
        totalExpenses,
        netAmount,
        codesCount: paymentCodes.length,
        expensesCount: expenses.length,
        byVision,
        paymentCodes: paymentCodes.map((code) => ({
          id: code.id,
          code: code.code,
          amount: Number(code.amount),
          redeemedAt: code.redeemedAt,
          redeemedBy: code.redeemedBy,
          vision: code.vision,
        })),
        expenses: expenses.map((exp) => ({
          id: exp.id,
          concept: exp.concept,
          amount: Number(exp.amount),
          category: exp.category,
          createdAt: exp.createdAt,
          vision: exp.vision,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting cash batch preview:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener vista previa' },
      { status: 500 }
    );
  }
}
