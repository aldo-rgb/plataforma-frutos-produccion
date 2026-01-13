import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const COORDINATOR_ROLES = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];

/**
 * POST /api/treasury/coordinator/batch/[batchId]/confirm
 * Coordinador confirma el corte con el código dado por el director
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user || !COORDINATOR_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { confirmationCode } = body;

    if (!confirmationCode || confirmationCode.trim() === '') {
      return NextResponse.json({ error: 'Ingresa el código de confirmación' }, { status: 400 });
    }

    // Obtener el batch
    const batch = await prisma.cashBatch.findUnique({
      where: { id: batchId }
    });

    if (!batch) {
      return NextResponse.json({ error: 'Corte no encontrado' }, { status: 404 });
    }

    // Verificar que el coordinador sea el dueño del corte
    if (batch.coordinatorId !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este corte' }, { status: 403 });
    }

    if (batch.status !== 'PENDING_DELIVERY') {
      return NextResponse.json({ error: 'Este corte ya fue procesado' }, { status: 400 });
    }

    if (!batch.confirmationCode) {
      return NextResponse.json({ 
        error: 'El director aún no ha generado el código de confirmación. Espera a que revise tu corte.' 
      }, { status: 400 });
    }

    // Verificar código (case insensitive)
    if (batch.confirmationCode.toUpperCase() !== confirmationCode.toUpperCase().trim()) {
      return NextResponse.json({ error: 'Código de confirmación incorrecto' }, { status: 400 });
    }

    // Confirmar el corte
    const updatedBatch = await prisma.cashBatch.update({
      where: { id: batchId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Corte confirmado exitosamente',
      batch: {
        id: updatedBatch.id,
        batchNumber: updatedBatch.batchNumber,
        status: updatedBatch.status,
        confirmedAt: updatedBatch.confirmedAt?.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error confirming batch:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al confirmar corte' },
      { status: 500 }
    );
  }
}
