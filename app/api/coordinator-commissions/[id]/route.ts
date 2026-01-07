import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Actualizar estado de una comisión
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.rol !== 'admin' && user.rol !== 'director')) {
      return NextResponse.json({ error: 'Solo admin/director pueden actualizar comisiones' }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes, payoutScheduledDate } = body;

    if (!status) {
      return NextResponse.json({ error: 'status requerido' }, { status: 400 });
    }

    const validStatuses = ['PENDING_REVIEW', 'AUTHORIZED', 'PAID', 'CANCELLED', 'DISPUTED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (status === 'AUTHORIZED') {
      updateData.verifiedBy = user.id;
      updateData.verifiedAt = new Date();
      if (payoutScheduledDate) {
        updateData.payoutScheduledDate = new Date(payoutScheduledDate);
      }
    }

    if (status === 'PAID') {
      updateData.payoutCompletedDate = new Date();
    }

    const commission = await prisma.coordinatorCommission.update({
      where: { id: parseInt(params.id) },
      data: updateData,
      include: {
        Coordinator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        RelatedUser: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        VerifiedByUser: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Comisión ${status === 'PAID' ? 'pagada' : status === 'AUTHORIZED' ? 'autorizada' : 'actualizada'} exitosamente`,
      commission
    });

  } catch (error: any) {
    console.error('Error actualizando comisión:', error);
    return NextResponse.json(
      { error: 'Error al actualizar comisión', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar comisión (solo si está en PENDING_REVIEW)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.rol !== 'admin' && user.rol !== 'director')) {
      return NextResponse.json({ error: 'Solo admin/director pueden eliminar comisiones' }, { status: 403 });
    }

    // Verificar que esté en PENDING_REVIEW
    const commission = await prisma.coordinatorCommission.findUnique({
      where: { id: parseInt(params.id) }
    });

    if (!commission) {
      return NextResponse.json({ error: 'Comisión no encontrada' }, { status: 404 });
    }

    if (commission.status !== 'PENDING_REVIEW') {
      return NextResponse.json({ 
        error: 'Solo se pueden eliminar comisiones en estado PENDING_REVIEW' 
      }, { status: 400 });
    }

    await prisma.coordinatorCommission.delete({
      where: { id: parseInt(params.id) }
    });

    return NextResponse.json({
      success: true,
      message: 'Comisión eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('Error eliminando comisión:', error);
    return NextResponse.json(
      { error: 'Error al eliminar comisión', details: error.message },
      { status: 500 }
    );
  }
}
