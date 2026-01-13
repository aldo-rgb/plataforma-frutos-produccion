import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];

/**
 * POST /api/treasury/coordinator/batch
 * Crea un nuevo corte de caja (entrega de efectivo)
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
    const { codeIds, notes } = body;

    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un código' }, { status: 400 });
    }

    // Verificar que todos los códigos existen y pertenecen al coordinador
    // Acepta códigos ACTIVE (pendientes) y REDEEMED (canjeados)
    const codes = await prisma.paymentCode.findMany({
      where: {
        id: { in: codeIds },
        createdById: user.id,
        status: { in: ['ACTIVE', 'REDEEMED'] }
      }
    });

    if (codes.length !== codeIds.length) {
      return NextResponse.json(
        { error: 'Algunos códigos no son válidos o ya fueron cancelados' },
        { status: 400 }
      );
    }

    // Calcular el total
    const totalAmount = codes.reduce((sum, c) => sum + Number(c.amount), 0);

    // Generar número de batch único
    const year = new Date().getFullYear();
    const count = await prisma.cashBatch.count({
      where: {
        coordinatorId: user.id,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    });
    const batchNumber = `BATCH-${year}-${String(count + 1).padStart(3, '0')}`;

    // Crear el batch
    const batch = await prisma.cashBatch.create({
      data: {
        batchNumber,
        totalCollected: totalAmount,
        totalExpenses: 0,
        netAmount: totalAmount,
        status: 'PENDING_DELIVERY',
        organizationId: user.organizationId,
        coordinatorId: user.id
      }
    });

    // Asociar los códigos al batch
    await prisma.paymentCode.updateMany({
      where: { id: { in: codeIds } },
      data: { batchId: batch.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Corte de caja enviado exitosamente',
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        amount: Number(batch.netAmount),
        codesCount: codes.length,
        status: batch.status
      }
    });

  } catch (error: any) {
    console.error('Error creating cash batch:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al crear corte de caja' },
      { status: 500 }
    );
  }
}
