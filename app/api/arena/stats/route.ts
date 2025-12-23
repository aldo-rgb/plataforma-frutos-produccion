/**
 * ⚔️ QUANTUM ARENA API
 * GET /api/arena/stats - Obtener estadísticas del usuario
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener o crear estadísticas
    let stats = await prisma.arenaStats.findUnique({
      where: { usuarioId: session.user.id },
    });

    if (!stats) {
      stats = await prisma.arenaStats.create({
        data: { usuarioId: session.user.id },
      });
    }

    // Calcular Win Rate
    const totalFinished = stats.wins + stats.losses + stats.ties;
    const winRate = totalFinished > 0 ? (stats.wins / totalFinished) * 100 : 0;

    return NextResponse.json({
      stats: {
        totalDuels: stats.totalDuels,
        wins: stats.wins,
        losses: stats.losses,
        ties: stats.ties,
        winRate: Math.round(winRate),
        totalWagered: stats.totalWagered,
        totalWon: stats.totalWon,
        totalLost: stats.totalLost,
        netProfit: stats.netProfit,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        badges: stats.badges,
        lastDuelAt: stats.lastDuelAt,
      },
    });
  } catch (error) {
    console.error('[ARENA API] Error en stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
