import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/treasury/expenses/[id]/approve
 * Aprueba o rechaza un gasto (Solo SCHOOL_ADMIN)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Solo admin puede aprobar gastos
    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo el administrador puede aprobar gastos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, rejectionReason } = body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Acción inválida. Usa "approve" o "reject"' },
        { status: 400 }
      );
    }

    // Buscar el gasto
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Gasto no encontrado' },
        { status: 404 }
      );
    }

    if (expense.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Este gasto ya fue procesado' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Gasto aprobado exitosamente',
      });
    } else {
      // Reject
      if (!rejectionReason) {
        return NextResponse.json(
          { success: false, error: 'Debe proporcionar un motivo de rechazo' },
          { status: 400 }
        );
      }

      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Gasto rechazado',
      });
    }
  } catch (error) {
    console.error('Error processing expense:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar gasto' },
      { status: 500 }
    );
  }
}
