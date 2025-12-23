/**
 * ⚔️ QUANTUM ARENA API
 * POST /api/arena/cancel-search - Cancelar búsqueda de rival
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cancelSearch } from '@/lib/arena-matchmaker';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await cancelSearch(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[ARENA API] Error en cancel-search:', error);
    return NextResponse.json(
      { error: 'Error al cancelar búsqueda' },
      { status: 500 }
    );
  }
}
