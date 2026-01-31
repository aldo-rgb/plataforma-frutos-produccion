import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Interfaces para tipos
interface PollOption {
  id: number;
  title: string;
  projectId: number | null;
  imageUrl: string | null;
  _count?: { votes: number };
  project?: unknown;
}

interface Poll {
  id: number;
  visionId: number;
  status: string;
  quorumPercentage: number;
  showResultsBeforeEnd: boolean;
  options: PollOption[];
  _count?: { votes: number; chatMessages?: number };
}

// GET - Obtener detalles de una votación específica
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const visionId = searchParams.get('visionId');

    if (!pollId && !visionId) {
      return NextResponse.json({ error: 'pollId o visionId requerido' }, { status: 400 });
    }

    // Verificar que el usuario pertenece a la tribu
    if (visionId) {
      const hasSigned = await prisma.tribeOath.findFirst({
        where: {
          visionId: parseInt(visionId),
          userId: userId
        }
      });

      if (!hasSigned) {
        return NextResponse.json(
          { error: 'Debes firmar el juramento de la tribu para participar' }, 
          { status: 403 }
        );
      }
    }

    if (pollId) {
      // Obtener una votación específica
      const poll = await prisma.tribePoll.findUnique({
        where: { id: parseInt(pollId) },
        include: {
          options: {
            include: {
              project: true,
              _count: { select: { votes: true } }
            },
            orderBy: { displayOrder: 'asc' }
          },
          createdBy: {
            select: { id: true, nombre: true, imagen: true }
          },
          _count: {
            select: { votes: true, chatMessages: true }
          }
        }
      });

      if (!poll) {
        return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
      }

      // Verificar si el usuario ya votó
      const userVote = await prisma.tribePollVote.findUnique({
        where: {
          pollId_userId: {
            pollId: parseInt(pollId),
            userId: userId
          }
        }
      });

      // Contar miembros de la tribu para quórum
      const tribeMembers = await prisma.tribeOath.count({
        where: {
          visionId: poll.visionId
        }
      });

      // Calcular participación
      const totalVotes = poll._count.votes;
      const participationPercentage = tribeMembers > 0 
        ? Math.round((totalVotes / tribeMembers) * 100) 
        : 0;

      // Solo mostrar resultados si está cerrada o si la config lo permite
      let results = null;
      if (poll.status === 'CLOSED' || poll.showResultsBeforeEnd) {
        results = poll.options.map((option: PollOption) => ({
          optionId: option.id,
          title: option.title,
          projectId: option.projectId,
          votes: option._count?.votes || 0
        }));
      }

      return NextResponse.json({
        poll: {
          ...poll,
          hasVoted: !!userVote,
          userVoteOptionId: userVote?.optionId || null,
          tribeMembers,
          participationPercentage,
          quorumReached: participationPercentage >= poll.quorumPercentage
        },
        results
      });
    }

    // Obtener todas las votaciones activas de la visión
    const polls = await prisma.tribePoll.findMany({
      where: {
        visionId: parseInt(visionId!),
        status: 'ACTIVE'
      },
      include: {
        options: {
          select: {
            id: true,
            title: true,
            imageUrl: true
          }
        },
        _count: {
          select: { votes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Verificar cuáles ya votó el usuario
    const userVotes = await prisma.tribePollVote.findMany({
      where: {
        userId: userId,
        pollId: { in: polls.map((p: Poll) => p.id) }
      }
    });

    const pollsWithVoteStatus = polls.map((poll: Poll) => ({
      ...poll,
      hasVoted: userVotes.some((v: { pollId: number }) => v.pollId === poll.id)
    }));

    return NextResponse.json({ polls: pollsWithVoteStatus });

  } catch (error) {
    console.error('Error en votaciones GET:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Emitir voto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { pollId, optionId } = body;

    if (!pollId || !optionId) {
      return NextResponse.json({ error: 'pollId y optionId requeridos' }, { status: 400 });
    }

    // Obtener la votación
    const poll = await prisma.tribePoll.findUnique({
      where: { id: parseInt(pollId) },
      include: {
        options: true
      }
    });

    if (!poll) {
      return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
    }

    if (poll.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'La votación no está activa' }, { status: 400 });
    }

    // Verificar que la opción pertenece a la votación
    const validOption = poll.options.find((o: { id: number }) => o.id === parseInt(optionId));
    if (!validOption) {
      return NextResponse.json({ error: 'Opción no válida' }, { status: 400 });
    }

    // Verificar que el usuario pertenece a la tribu
    const hasSigned = await prisma.tribeOath.findFirst({
      where: {
        visionId: poll.visionId,
        userId: userId
      }
    });

    if (!hasSigned) {
      return NextResponse.json(
        { error: 'Debes firmar el juramento de la tribu para votar' }, 
        { status: 403 }
      );
    }

    // Verificar si ya votó
    const existingVote = await prisma.tribePollVote.findUnique({
      where: {
        pollId_userId: {
          pollId: parseInt(pollId),
          userId: userId
        }
      }
    });

    if (existingVote) {
      return NextResponse.json({ error: 'Ya has votado en esta encuesta' }, { status: 400 });
    }

    // Determinar el peso del voto (2 si es capitán o staff, 1 normal)
    const isCaptain = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: { visionId: poll.visionId }
      }
    });

    const isStaff = await prisma.visionStaff.findFirst({
      where: {
        userId: userId,
        visionId: poll.visionId
      }
    });

    // El peso extra solo aplica en caso de desempate
    // Por ahora todos votan con peso 1, el desempate se calcula al cerrar
    const voteWeight = (isCaptain || isStaff) ? 2 : 1;

    // Crear el voto
    const vote = await prisma.tribePollVote.create({
      data: {
        pollId: parseInt(pollId),
        optionId: parseInt(optionId),
        userId: userId,
        weight: voteWeight
      }
    });

    // Contar votos actuales
    const totalVotes = await prisma.tribePollVote.count({
      where: { pollId: parseInt(pollId) }
    });

    const tribeMembers = await prisma.tribeOath.count({
      where: {
        visionId: poll.visionId
      }
    });

    const participationPercentage = tribeMembers > 0 
      ? Math.round((totalVotes / tribeMembers) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      message: '¡Tu voto ha sido registrado!',
      vote: {
        id: vote.id,
        optionId: vote.optionId
      },
      stats: {
        totalVotes,
        tribeMembers,
        participationPercentage,
        quorumReached: participationPercentage >= poll.quorumPercentage
      }
    });

  } catch (error) {
    console.error('Error al votar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
