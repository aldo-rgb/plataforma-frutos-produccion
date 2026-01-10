import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/treasury/cash-batch/[id]/confirm
 * Admin confirma la recepción de un corte de caja
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      select: { id: true, rol: true, nombre: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden confirmar cortes' },
        { status: 403 }
      );
    }

    const batchId = parseInt(params.id);

    const existingBatch = await prisma.cashBatch.findUnique({
      where: { id: batchId },
      include: {
        coordinator: {
          select: { nombre: true },
        },
      },
    });

    if (!existingBatch) {
      return NextResponse.json(
        { success: false, error: 'Corte no encontrado' },
        { status: 404 }
      );
    }

    if (existingBatch.status === 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: 'Este corte ya fue confirmado' },
        { status: 400 }
      );
    }

    if (existingBatch.status !== 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: 'El coordinador aún no ha reportado la entrega' },
        { status: 400 }
      );
    }

    // Confirmar el corte
    const confirmedBatch = await prisma.cashBatch.update({
      where: { id: batchId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        receivedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Corte ${existingBatch.batchNumber} confirmado exitosamente`,
      cashBatch: {
        id: confirmedBatch.id,
        batchNumber: confirmedBatch.batchNumber,
        netAmount: Number(confirmedBatch.netAmount),
        status: confirmedBatch.status,
        confirmedAt: confirmedBatch.confirmedAt,
        coordinator: existingBatch.coordinator?.nombre,
        confirmedBy: user.nombre,
      },
    });
  } catch (error) {
    console.error('Error confirming cash batch:', error);
    return NextResponse.json(
      { success: false, error: 'Error al confirmar corte' },
      { status: 500 }
    );
  }
}
