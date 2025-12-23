/**
 * ⚔️ QUANTUM ARENA API
 * POST /api/arena/taunt - Enviar provocación al rival
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TauntType } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { duelId, tauntType } = await req.json();

    if (!duelId || !tauntType) {
      return NextResponse.json(
        { error: 'Faltan parámetros: duelId, tauntType' },
        { status: 400 }
      );
    }

    // Verificar que el duelo existe y el usuario es participante
    const duel = await prisma.arenaDuel.findUnique({
      where: { id: duelId },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duelo no encontrado' }, { status: 404 });
    }

    const isParticipant =
      duel.player1Id === session.user.id || duel.player2Id === session.user.id;

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'No eres participante de este duelo' },
        { status: 403 }
      );
    }

    // Determinar el receiver (el rival)
    const receiverId =
      duel.player1Id === session.user.id ? duel.player2Id : duel.player1Id;

    // Crear taunt
    const taunt = await prisma.arenaTaunt.create({
      data: {
        duelId,
        senderId: session.user.id,
        receiverId,
        tauntType: tauntType as TauntType,
      },
    });

    // Mensajes de los taunts
    const tauntMessages: Record<TauntType, string> = {
      NO_FALLO: '🛡️ ¡Hoy no fallaré!',
      ES_TODO: '⚔️ ¿Eso es todo lo que tienes?',
      BUEN_TRABAJO: '🤝 ¡Buen trabajo!',
      PRESION: '🔥 Siente la presión',
      VENGANZA: '💀 Esto es personal',
    };

    return NextResponse.json({
      success: true,
      message: tauntMessages[tauntType as TauntType],
      taunt,
    });
  } catch (error) {
    console.error('[ARENA API] Error en taunt:', error);
    return NextResponse.json(
      { error: 'Error al enviar provocación' },
      { status: 500 }
    );
  }
}
