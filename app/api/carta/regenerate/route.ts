import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTasksForLetter } from '@/lib/taskGenerator';

/**
 * POST /api/carta/regenerate
 * Regenera las tareas de una carta aprobada (útil si fallaron en la primera generación)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { cartaId } = await req.json();
    const userId = parseInt(session.user.id);

    // Verificar permisos (debe ser mentor, admin o el dueño de la carta)
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      select: { usuarioId: true, estado: true }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    const isOwner = carta.usuarioId === userId;
    const isMentorOrAdmin = user && ['MENTOR', 'ADMIN', 'COORDINADOR'].includes(user.rol);

    if (!isOwner && !isMentorOrAdmin) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    if (carta.estado !== 'APROBADA') {
      return NextResponse.json(
        { error: 'La carta debe estar aprobada para regenerar tareas' },
        { status: 400 }
      );
    }

    // Eliminar tareas existentes si las hay
    const deletedTasks = await prisma.taskInstance.deleteMany({
      where: {
        usuarioId: carta.usuarioId,
        Accion: {
          Meta: {
            cartaId: cartaId
          }
        }
      }
    });

    console.log(`🗑️  Eliminadas ${deletedTasks.count} tareas antiguas`);

    // Regenerar tareas
    console.log(`🚀 Regenerando tareas para Carta #${cartaId}`);
    const result = await generateTasksForLetter(cartaId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Error al generar tareas', details: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tareas regeneradas exitosamente. Se generaron ${result.tasksCreated} tareas.`,
      tasksCreated: result.tasksCreated,
      tasksDeleted: deletedTasks.count
    });

  } catch (error: any) {
    console.error('Error regenerating tasks:', error);
    return NextResponse.json(
      { error: 'Error al regenerar tareas', details: error.message },
      { status: 500 }
    );
  }
}
