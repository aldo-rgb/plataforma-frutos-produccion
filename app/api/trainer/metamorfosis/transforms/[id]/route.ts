import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// DELETE - Eliminar una transformación personalizada
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const transformId = parseInt(id);

    if (isNaN(transformId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await prisma.metamorfosisTransform.findUnique({
      where: { id: transformId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transformación no encontrada' }, { status: 404 });
    }

    // No permitir eliminar elementos del sistema
    if (existing.isSystemDefault) {
      return NextResponse.json({ error: 'No se pueden eliminar elementos del sistema' }, { status: 403 });
    }

    // Solo el dueño puede eliminar
    if (existing.trainerId !== userId) {
      return NextResponse.json({ error: 'Solo puedes eliminar tus propios elementos' }, { status: 403 });
    }

    // Soft delete
    await prisma.metamorfosisTransform.update({
      where: { id: transformId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error al eliminar transformación:', error);
    return NextResponse.json({ error: 'Error al eliminar elemento' }, { status: 500 });
  }
}
