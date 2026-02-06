// 🏦 API Gestión individual de créditos escolares
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// GET: Obtener detalle de un crédito específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const creditId = parseInt(id);

    const credit = await prisma.schoolCredit.findUnique({
      where: { id: creditId },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            contactEmail: true,
          },
        },
      },
    });

    if (!credit) {
      return NextResponse.json({ error: 'Crédito no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ...credit,
      available: credit.totalPurchased - credit.totalAllocated,
      utilizationRate: credit.totalPurchased > 0
        ? ((credit.totalAllocated / credit.totalPurchased) * 100).toFixed(2)
        : '0.00',
    });
  } catch (error) {
    logger.error('Error fetching school credit:', error);
    return NextResponse.json({ error: 'Error al obtener crédito' }, { status: 500 });
  }
}

// PATCH: Editar un crédito (solo campos editables, no totalAllocated)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const creditId = parseInt(id);
    const data = await request.json();

    // Campos editables: totalPurchased, unitPrice, expirationDate, isActive, notes
    const updateData: any = {};

    if (data.totalPurchased !== undefined) {
      // Validar que no sea menor al ya asignado
      const current = await prisma.schoolCredit.findUnique({
        where: { id: creditId },
        select: { totalAllocated: true },
      });

      if (current && data.totalPurchased < current.totalAllocated) {
        return NextResponse.json(
          { error: `No puedes reducir totalPurchased por debajo de ${current.totalAllocated} (ya asignados)` },
          { status: 400 }
        );
      }

      updateData.totalPurchased = data.totalPurchased;
    }

    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.expirationDate !== undefined) {
      updateData.expirationDate = data.expirationDate ? new Date(data.expirationDate) : null;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Recalcular totalPaid si cambió precio o cantidad
    if (updateData.totalPurchased || updateData.unitPrice) {
      const current = await prisma.schoolCredit.findUnique({
        where: { id: creditId },
        select: { totalPurchased: true, unitPrice: true },
      });

      const finalPurchased = updateData.totalPurchased ?? current?.totalPurchased ?? 0;
      const finalUnitPrice = updateData.unitPrice ?? current?.unitPrice ?? 0;
      updateData.totalPaid = finalPurchased * finalUnitPrice;
    }

    const updatedCredit = await prisma.schoolCredit.update({
      where: { id: creditId },
      data: updateData,
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(updatedCredit);
  } catch (error) {
    logger.error('Error updating school credit:', error);
    return NextResponse.json({ error: 'Error al actualizar crédito' }, { status: 500 });
  }
}

// DELETE: Eliminar un crédito (solo si no se ha asignado ningún código)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const creditId = parseInt(id);

    const credit = await prisma.schoolCredit.findUnique({
      where: { id: creditId },
      select: { totalAllocated: true },
    });

    if (!credit) {
      return NextResponse.json({ error: 'Crédito no encontrado' }, { status: 404 });
    }

    if (credit.totalAllocated > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un crédito con códigos ya generados' },
        { status: 400 }
      );
    }

    await prisma.schoolCredit.delete({
      where: { id: creditId },
    });

    return NextResponse.json({ message: 'Crédito eliminado exitosamente' });
  } catch (error) {
    logger.error('Error deleting school credit:', error);
    return NextResponse.json({ error: 'Error al eliminar crédito' }, { status: 500 });
  }
}
