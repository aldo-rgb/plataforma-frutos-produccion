import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { receiptUrl } = await req.json();

    if (!receiptUrl) {
      return NextResponse.json({ success: false, error: 'URL de evidencia requerida' }, { status: 400 });
    }

    // Verificar que el gasto pertenece al usuario
    const expense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Gasto no encontrado' }, { status: 404 });
    }

    if (expense.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ success: false, error: 'No autorizado para modificar este gasto' }, { status: 403 });
    }

    // Actualizar el gasto con la URL de la evidencia
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: { receiptUrl }
    });

    return NextResponse.json({ 
      success: true, 
      expense: updatedExpense 
    });

  } catch (error) {
    console.error('Error updating expense evidence:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
