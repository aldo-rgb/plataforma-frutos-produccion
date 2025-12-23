import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTaskStats } from '@/lib/taskGenerator';

/**
 * GET /api/carta/[id]/stats
 * Obtiene estadísticas de las tareas generadas para una carta
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cartaId = parseInt(params.id);
    const stats = await getTaskStats(cartaId);

    if (!stats) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Error getting carta stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', details: error.message },
      { status: 500 }
    );
  }
}
