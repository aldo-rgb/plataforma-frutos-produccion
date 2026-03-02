import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

const ALLOWED_ROLES = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];

/**
 * POST /api/treasury/coordinator/batch
 * Crea un nuevo corte de caja (entrega de efectivo)
 * Incluye códigos de pago y gastos pendientes
 */
export async function POST(request: Request) {
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

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 400 });
    }

    const body = await request.json();
    const { codeIds = [], notes } = body;

    // Verificar que codeIds sea un array (puede estar vacío)
    if (!Array.isArray(codeIds)) {
      return NextResponse.json({ error: 'Formato de códigos inválido' }, { status: 400 });
    }

    let codes: any[] = [];
    
    // Si hay códigos, verificar que existen y pertenecen al coordinador
    if (codeIds.length > 0) {
      codes = await prisma.paymentCode.findMany({
        where: {
          id: { in: codeIds },
          createdById: user.id,
          status: { in: ['ACTIVE', 'REDEEMED'] },
          batchId: null // Solo códigos sin batch asignado
        }
      });

      if (codes.length !== codeIds.length) {
        return NextResponse.json(
          { error: 'Algunos códigos no son válidos o ya fueron procesados' },
          { status: 400 }
        );
      }
    }

    // Obtener gastos pendientes del coordinador (sin batch asignado)
    const pendingExpenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        status: 'PENDING',
        batchId: null
      }
    });

    // Validar que haya al menos códigos o gastos para procesar
    if (codes.length === 0 && pendingExpenses.length === 0) {
      return NextResponse.json(
        { error: 'Debe haber al menos un código o gasto para hacer el corte' },
        { status: 400 }
      );
    }

    // Calcular totales
    const totalCollected = codes.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalExpenses = pendingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netAmount = totalCollected - totalExpenses;

    // Generar número de batch único (global, no solo por coordinador)
    const year = new Date().getFullYear();
    const lastBatch = await prisma.cashBatch.findFirst({
      where: {
        batchNumber: { startsWith: `BATCH-${year}-` }
      },
      orderBy: { batchNumber: 'desc' },
      select: { batchNumber: true }
    });
    
    let nextNumber = 1;
    if (lastBatch?.batchNumber) {
      const parts = lastBatch.batchNumber.split('-');
      const lastNum = parseInt(parts[2] || '0', 10);
      nextNumber = lastNum + 1;
    }
    const batchNumber = `BATCH-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Crear el batch con códigos y gastos
    const batch = await prisma.cashBatch.create({
      data: {
        id: randomUUID(),
        batchNumber,
        totalCollected,
        totalExpenses,
        netAmount,
        status: 'PENDING_DELIVERY',
        organizationId: user.organizationId,
        coordinatorId: user.id
      }
    });

    // Asociar los códigos al batch (solo si hay códigos)
    if (codeIds.length > 0) {
      await prisma.paymentCode.updateMany({
        where: { id: { in: codeIds } },
        data: { batchId: batch.id }
      });
    }

    // Asociar los gastos al batch (solo si hay gastos)
    if (pendingExpenses.length > 0) {
      await prisma.expense.updateMany({
        where: { id: { in: pendingExpenses.map(e => e.id) } },
        data: { batchId: batch.id }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Corte de caja enviado exitosamente',
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        totalCollected,
        totalExpenses,
        netAmount,
        codesCount: codes.length,
        expensesCount: pendingExpenses.length,
        status: batch.status
      }
    });

  } catch (error: any) {
    logger.error('Error creating cash batch:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al crear corte de caja' },
      { status: 500 }
    );
  }
}
