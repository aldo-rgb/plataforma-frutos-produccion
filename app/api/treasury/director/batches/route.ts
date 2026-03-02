import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const DIRECTOR_ROLES = ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'];

/**
 * GET /api/treasury/director/batches
 * Obtiene todos los cortes de caja pendientes para revisión del director
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

    if (!user || !DIRECTOR_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'Solo directores pueden acceder' }, { status: 403 });
    }

    // Obtener cortes pendientes de entrega de la organización
    const batches = await prisma.cashBatch.findMany({
      where: {
        organizationId: user.organizationId!,
        status: 'PENDING_DELIVERY'
      },
      include: {
        Usuario_CashBatch_coordinatorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            profileImage: true
          }
        },
        PaymentCode: {
          select: {
            id: true,
            code: true,
            amount: true,
            status: true,
            reference: true,
            createdAt: true
          }
        },
        Expense: {
          select: {
            id: true,
            concept: true,
            amount: true,
            category: true,
            receiptUrl: true,
            notes: true,
            createdAt: true
          }
        },
        Usuario_CashBatch_codeGeneratedByIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      batches: batches.map(b => ({
        id: b.id,
        batchNumber: b.batchNumber,
        totalCollected: Number(b.totalCollected),
        totalExpenses: Number(b.totalExpenses),
        netAmount: Number(b.netAmount),
        status: b.status,
        confirmationCode: b.confirmationCode,
        codeGeneratedAt: b.codeGeneratedAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
        coordinator: b.Usuario_CashBatch_coordinatorIdToUsuario,
        codeGeneratedBy: b.Usuario_CashBatch_codeGeneratedByIdToUsuario,
        paymentCodes: b.PaymentCode.map(c => ({
          id: c.id,
          code: c.code,
          amount: Number(c.amount),
          status: c.status,
          reference: c.reference,
          createdAt: c.createdAt.toISOString()
        })),
        expenses: b.Expense.map(e => ({
          id: e.id,
          concept: e.concept,
          amount: Number(e.amount),
          category: e.category,
          receiptUrl: e.receiptUrl,
          notes: e.notes,
          createdAt: e.createdAt.toISOString()
        }))
      }))
    });

  } catch (error: any) {
    logger.error('Error fetching director batches:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener cortes' },
      { status: 500 }
    );
  }
}
