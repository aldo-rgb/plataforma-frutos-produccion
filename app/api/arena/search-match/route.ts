/**
 * ⚔️ QUANTUM ARENA API
 * POST /api/arena/search-match - Buscar rival y entrar a duelo
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchMatch } from '@/lib/arena-matchmaker';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar match
    const result = await searchMatch(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      duelId: result.duelId,
      rival: result.rival,
    });
  } catch (error) {
    console.error('[ARENA API] Error en search-match:', error);
    return NextResponse.json(
      { error: 'Error al buscar rival' },
      { status: 500 }
    );
  }
}
