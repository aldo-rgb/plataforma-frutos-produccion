import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE - Eliminar meta extraordinaria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    await prisma.metaExtraordinaria.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error al eliminar meta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar meta' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Actualizar meta (activar/desactivar)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();

    const metaActualizada = await prisma.metaExtraordinaria.update({
      where: { id },
      data: {
        activa: body.activa
      }
    });

    return NextResponse.json(metaActualizada);

  } catch (error) {
    console.error('Error al actualizar meta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar meta' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
