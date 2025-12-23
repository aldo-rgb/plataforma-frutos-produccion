/**
 * ⚔️ QUANTUM ARENA API
 * GET /api/arena/active-duel - Obtener duelo activo del usuario
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

    // Buscar duelo activo
    const duel = await prisma.arenaDuel.findFirst({
      where: {
        OR: [
          { player1Id: session.user.id },
          { player2Id: session.user.id },
        ],
        status: 'ACTIVE',
      },
      include: {
        Player1: {
          select: {
            id: true,
            nombre: true,
            profileImage: true,
            rangoActual: true,
          },
        },
        Player2: {
          select: {
            id: true,
            nombre: true,
            profileImage: true,
            rangoActual: true,
          },
        },
        DailyUpdates: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    if (!duel) {
      return NextResponse.json({ duel: null });
    }

    // Determinar quién es el usuario y quién es el rival
    const isPlayer1 = duel.player1Id === session.user.id;
    const myHP = isPlayer1 ? duel.player1HP : duel.player2HP;
    const rivalHP = isPlayer1 ? duel.player2HP : duel.player1HP;
    const rival = isPlayer1 ? duel.Player2 : duel.Player1;

    // Calcular días restantes
    const now = new Date();
    const daysRemaining = Math.ceil(
      (duel.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      duel: {
        id: duel.id,
        status: duel.status,
        escrowTotal: duel.escrowTotal,
        startDate: duel.startDate,
        endDate: duel.endDate,
        daysRemaining,
        myHP,
        rivalHP,
        rival: {
          id: rival.id,
          nombre: rival.nombre,
          avatar: rival.profileImage,
          nivel: rival.rangoActual,
        },
        history: duel.DailyUpdates.map((update) => ({
          date: update.date,
          myHP: isPlayer1 ? update.player1HP : update.player2HP,
          rivalHP: isPlayer1 ? update.player2HP : update.player1HP,
          myDamage: isPlayer1 ? update.player1Damage : update.player2Damage,
          rivalDamage: isPlayer1 ? update.player2Damage : update.player1Damage,
          narration: update.narration,
        })),
      },
    });
  } catch (error) {
    console.error('[ARENA API] Error en active-duel:', error);
    return NextResponse.json(
      { error: 'Error al obtener duelo activo' },
      { status: 500 }
    );
  }
}
