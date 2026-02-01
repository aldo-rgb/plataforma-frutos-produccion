import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ShirtSize } from '@prisma/client';

// Tipos - usando null para coincidir con Prisma
interface PollOption {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  _count?: { votes: number };
  votes?: { weight: number }[];
}

interface Poll {
  id: number;
  visionId: number;
  title: string;
  status: string;
  category: string;
  quorumPercentage: number;
  tieBreakerWeight: number;
  showResultsBeforeEnd: boolean;
  options: PollOption[];
  _count?: { votes: number; chatMessages: number };
}

// Categorías válidas por tipo de capitanía
const CATEGORY_BY_ROLE: Record<string, string[]> = {
  'COMMUNITY_SERVICE': ['COMMUNITY', 'GENERAL'],
  'SHIRT_DESIGN': ['LOGO', 'SHIRT', 'GENERAL'],
  'SHIRTS_LOGO': ['LOGO', 'SHIRT', 'GENERAL'],
  'FOOD': ['FOOD', 'GENERAL'],
  'TRANSPORT': ['TRANSPORT', 'GENERAL'],
  'GRADUATION': ['GRADUATION', 'VENUE', 'GENERAL'],
  'GRADUATION_CAPTAIN': ['GRADUATION', 'VENUE', 'GENERAL'],
  'BUDGET': ['BUDGET', 'GENERAL'],
  'TREASURER': ['BUDGET', 'GENERAL'],
  'SCHEDULE': ['SCHEDULE', 'GENERAL'],
  'TRIBE_CAPTAIN': ['LOGO', 'SHIRT', 'COMMUNITY', 'FOOD', 'GRADUATION', 'MUSIC', 'RECOGNITION', 'BAPTISM', 'FAREWELL', 'TRANSPORT', 'GENERAL'],
  'CONTEXT_GUARDIAN': ['GENERAL'],
};

// GET - Obtener votaciones de una visión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const pollId = searchParams.get('pollId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    if (!visionId && !pollId) {
      return NextResponse.json({ error: 'visionId o pollId requerido' }, { status: 400 });
    }

    // Verificar que el usuario pertenece a la tribu
    if (visionId) {
      const isTribeMember = await prisma.tribeOath.findFirst({
        where: {
          visionId: parseInt(visionId),
          userId: userId
        }
      });

      const isStaff = await prisma.visionStaff.findFirst({
        where: {
          userId: userId,
          visionId: parseInt(visionId)
        }
      });

      if (!isTribeMember && !isStaff) {
        return NextResponse.json(
          { error: 'Debes ser miembro de la tribu para ver las votaciones' }, 
          { status: 403 }
        );
      }
    }

    // Si se solicita una votación específica
    if (pollId) {
      const poll = await prisma.tribePoll.findUnique({
        where: { id: parseInt(pollId) },
        include: {
          options: {
            include: {
              _count: { select: { votes: true } },
              votes: {
                select: { weight: true }
              }
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
        where: { visionId: poll.visionId }
      });

      // Calcular participación
      const uniqueVoters = poll._count?.votes || 0;
      const participationPercentage = tribeMembers > 0 
        ? Math.round((uniqueVoters / tribeMembers) * 100) 
        : 0;

      // Calcular resultados si está permitido o cerrada
      let results = null;
      if (poll.status === 'CLOSED' || poll.showResultsBeforeEnd) {
        results = poll.options.map((opt: PollOption) => {
          const totalWeight = opt.votes?.reduce((sum: number, v: { weight: number }) => sum + v.weight, 0) || 0;
          return {
            optionId: opt.id,
            title: opt.title,
            votes: opt._count?.votes || 0,
            weightedVotes: totalWeight,
            percentage: uniqueVoters > 0 
              ? Math.round((totalWeight / (poll._count?.votes || 1)) * 100) 
              : 0
          };
        }).sort((a: { weightedVotes: number }, b: { weightedVotes: number }) => b.weightedVotes - a.weightedVotes);
      }

      // Verificar si el usuario es capitán de la categoría
      const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
        where: {
          userId: userId,
          status: 'ACCEPTED',
          captaincy: {
            visionId: poll.visionId
          }
        },
        include: {
          captaincy: true
        }
      });

      const isStaff = await prisma.visionStaff.findFirst({
        where: {
          userId: userId,
          visionId: poll.visionId
        }
      });

      return NextResponse.json({
        poll: {
          ...poll,
          hasVoted: !!userVote,
          userVoteOptionId: userVote?.optionId || null
        },
        stats: {
          tribeMembers,
          uniqueVoters,
          participationPercentage,
          quorumReached: participationPercentage >= poll.quorumPercentage
        },
        results,
        permissions: {
          canManage: !!captainAssignment || !!isStaff,
          canVote: !userVote && poll.status === 'ACTIVE',
          isCaptain: !!captainAssignment,
          isStaff: !!isStaff
        }
      });
    }

    // Obtener todas las votaciones de la visión
    const whereClause: Record<string, unknown> = {
      visionId: parseInt(visionId!)
    };

    if (category) {
      whereClause.category = category;
    }

    if (status) {
      whereClause.status = status;
    }

    const polls = await prisma.tribePoll.findMany({
      where: whereClause,
      include: {
        options: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            _count: {
              select: { votes: true }
            }
          }
        },
        createdBy: {
          select: { id: true, nombre: true }
        },
        _count: {
          select: { votes: true, chatMessages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Verificar cuáles ya votó el usuario
    const userVotes = await prisma.tribePollVote.findMany({
      where: {
        userId: userId,
        pollId: { in: polls.map((p) => p.id) }
      },
      select: { pollId: true, optionId: true }
    });

    const votedPollIds = new Set(userVotes.map(v => v.pollId));

    // Contar miembros de la tribu para calcular participación
    const tribeMembers = await prisma.tribeOath.count({
      where: { visionId: parseInt(visionId!) }
    });

    const pollsWithStatus = polls.map((poll) => {
      const totalVotes = poll._count?.votes || 0;
      const participationPercentage = tribeMembers > 0 
        ? Math.round((totalVotes / tribeMembers) * 100) 
        : 0;
      
      return {
        ...poll,
        hasVoted: votedPollIds.has(poll.id),
        stats: {
          tribeMembers,
          totalVotes,
          participationPercentage,
          quorumReached: participationPercentage >= (poll.quorumPercentage || 80)
        }
      };
    });

    // Verificar si el usuario es capitán o staff para determinar permisos
    const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: parseInt(visionId!)
        }
      },
      include: {
        captaincy: true
      }
    });

    const isStaffMember = await prisma.visionStaff.findFirst({
      where: {
        userId: userId,
        visionId: parseInt(visionId!)
      }
    });

    // Verificar si es Capitán de Tribu o Co-Capitán (tienen acceso completo)
    const isTribeCaptainOrCoCaptain = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: parseInt(visionId!),
          roleType: { in: ['TRIBE_CAPTAIN', 'TRIBE_CO_CAPTAIN'] }
        }
      }
    });

    return NextResponse.json({
      polls: pollsWithStatus,
      categories: Object.keys(CATEGORY_BY_ROLE),
      userPermissions: {
        canCreate: !!captainAssignment || !!isStaffMember || !!isTribeCaptainOrCoCaptain,
        canManage: !!captainAssignment || !!isStaffMember || !!isTribeCaptainOrCoCaptain,
        isCaptain: !!captainAssignment || !!isTribeCaptainOrCoCaptain,
        isTribeCaptain: !!isTribeCaptainOrCoCaptain
      }
    });

  } catch (error) {
    console.error('Error en tribe-polls GET:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear votación, votar, cerrar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { action, visionId, pollId, ...data } = body;

    if (!action) {
      return NextResponse.json({ error: 'action requerido' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        // Crear una nueva votación
        if (!visionId) {
          return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
        }

        const { title, description, category, options, quorumPercentage, showResultsBeforeEnd, endDate } = data;

        if (!title || !category || !options || options.length < 2) {
          return NextResponse.json(
            { error: 'title, category y al menos 2 options son requeridos' },
            { status: 400 }
          );
        }

        // Verificar que el usuario es capitán o staff
        const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
          where: {
            userId: userId,
            status: 'ACCEPTED',
            captaincy: {
              visionId: parseInt(visionId)
            }
          },
          include: {
            captaincy: true
          }
        });

        const isStaff = await prisma.visionStaff.findFirst({
          where: {
            userId: userId,
            visionId: parseInt(visionId)
          }
        });

        if (!captainAssignment && !isStaff) {
          return NextResponse.json(
            { error: 'Solo capitanes o staff pueden crear votaciones' }, 
            { status: 403 }
          );
        }

        // Para Identity Lab (LOGO), cualquier capitán o staff puede crear
        // La verificación de categoría solo aplica a otras categorías específicas
        if (captainAssignment && !isStaff && category !== 'LOGO') {
          const allowedCategories = CATEGORY_BY_ROLE[captainAssignment.captaincy.roleType] || ['GENERAL'];
          if (!allowedCategories.includes(category)) {
            return NextResponse.json(
              { error: `Tu capitanía no puede crear votaciones de categoría ${category}` },
              { status: 403 }
            );
          }
        }

        // Normalizar opciones (aceptar strings o objetos)
        const normalizedOptions = options.map((opt: string | { title: string; description?: string; imageUrl?: string }, index: number) => {
          if (typeof opt === 'string') {
            return { title: opt, description: undefined, imageUrl: undefined, displayOrder: index };
          }
          return { ...opt, displayOrder: index };
        });

        const poll = await prisma.tribePoll.create({
          data: {
            visionId: parseInt(visionId),
            title,
            description,
            category,
            status: 'ACTIVE',
            quorumPercentage: quorumPercentage || 80,
            showResultsBeforeEnd: showResultsBeforeEnd ?? true,
            endDate: endDate ? new Date(endDate) : null,
            createdById: userId,
            options: {
              create: normalizedOptions.map((opt: { title: string; description?: string; imageUrl?: string; displayOrder: number }) => ({
                title: opt.title,
                description: opt.description,
                imageUrl: opt.imageUrl,
                displayOrder: opt.displayOrder
              }))
            }
          },
          include: {
            options: true
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Votación creada exitosamente',
          poll
        });
      }

      case 'publish': {
        // Publicar/activar una votación
        if (!pollId) {
          return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
        }

        const poll = await prisma.tribePoll.findUnique({
          where: { id: parseInt(pollId) },
          include: {
            _count: { select: { options: true } }
          }
        });

        if (!poll) {
          return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
        }

        // Verificar permisos
        const canManage = await checkPollPermissions(userId, poll.visionId, poll.createdById);
        if (!canManage) {
          return NextResponse.json({ error: 'No tienes permiso para publicar esta votación' }, { status: 403 });
        }

        if (poll.status !== 'DRAFT') {
          return NextResponse.json({ error: 'Solo se pueden publicar votaciones en borrador' }, { status: 400 });
        }

        if (poll._count.options < 2) {
          return NextResponse.json({ error: 'La votación debe tener al menos 2 opciones' }, { status: 400 });
        }

        const updatedPoll = await prisma.tribePoll.update({
          where: { id: parseInt(pollId) },
          data: {
            status: 'ACTIVE',
            startDate: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          message: '¡Votación publicada! La tribu ya puede votar.',
          poll: updatedPoll
        });
      }

      case 'vote': {
        // Emitir un voto
        if (!pollId) {
          return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
        }

        const { optionId, shirtSize } = data;
        if (!optionId) {
          return NextResponse.json({ error: 'optionId requerido' }, { status: 400 });
        }

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

        // La talla solo es requerida para votaciones de LOGO (Identity Lab)
        if (poll.category === 'LOGO' && !shirtSize) {
          return NextResponse.json({ error: 'Debes seleccionar tu talla de playera' }, { status: 400 });
        }

        // Validar que la talla sea válida si se proporciona
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        if (shirtSize && !validSizes.includes(shirtSize)) {
          return NextResponse.json({ error: 'Talla no válida' }, { status: 400 });
        }

        // Verificar que la opción pertenece a la votación
        const validOption = poll.options.find((o: { id: number }) => o.id === parseInt(optionId));
        if (!validOption) {
          return NextResponse.json({ error: 'Opción no válida' }, { status: 400 });
        }

        // Verificar que el usuario pertenece a la tribu
        const isTribeMember = await prisma.tribeOath.findFirst({
          where: {
            visionId: poll.visionId,
            userId: userId
          }
        });

        if (!isTribeMember) {
          return NextResponse.json(
            { error: 'Debes ser miembro de la tribu para votar' }, 
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
          return NextResponse.json({ error: 'Ya has votado en esta votación' }, { status: 400 });
        }

        // Determinar peso del voto
        const isStaff = await prisma.visionStaff.findFirst({
          where: {
            userId: userId,
            visionId: poll.visionId
          }
        });

        const isCaptain = await prisma.tribeCaptainAssignment.findFirst({
          where: {
            userId: userId,
            status: 'ACCEPTED',
            captaincy: { visionId: poll.visionId }
          }
        });

        // Peso normal es 1, líderes tienen peso especial para desempate
        const voteWeight = (isStaff || isCaptain) ? poll.tieBreakerWeight : 1;

        const vote = await prisma.tribePollVote.create({
          data: {
            pollId: parseInt(pollId),
            optionId: parseInt(optionId),
            userId: userId,
            weight: voteWeight,
            shirtSize: shirtSize ? shirtSize as ShirtSize : null
          }
        });

        // Calcular estadísticas actualizadas
        const totalVotes = await prisma.tribePollVote.count({
          where: { pollId: parseInt(pollId) }
        });

        const tribeMembers = await prisma.tribeOath.count({
          where: { visionId: poll.visionId }
        });

        const participationPercentage = tribeMembers > 0 
          ? Math.round((totalVotes / tribeMembers) * 100) 
          : 0;

        return NextResponse.json({
          success: true,
          message: '¡Tu voto ha sido registrado!',
          vote: {
            id: vote.id,
            optionId: vote.optionId,
            weight: vote.weight
          },
          stats: {
            totalVotes,
            tribeMembers,
            participationPercentage,
            quorumReached: participationPercentage >= poll.quorumPercentage
          }
        });
      }

      case 'close': {
        // Cerrar votación y determinar ganador
        if (!pollId) {
          return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
        }

        const poll = await prisma.tribePoll.findUnique({
          where: { id: parseInt(pollId) },
          include: {
            options: {
              include: {
                votes: true
              }
            }
          }
        });

        if (!poll) {
          return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
        }

        // Verificar permisos
        const canManage = await checkPollPermissions(userId, poll.visionId, poll.createdById);
        if (!canManage) {
          return NextResponse.json({ error: 'No tienes permiso para cerrar esta votación' }, { status: 403 });
        }

        if (poll.status !== 'ACTIVE') {
          return NextResponse.json({ error: 'Solo se pueden cerrar votaciones activas' }, { status: 400 });
        }

        // Calcular resultados
        interface ResultItem {
          optionId: number;
          title: string;
          imageUrl?: string | null;
          totalVotes: number;
          weightedVotes: number;
        }
        
        const results: ResultItem[] = poll.options.map((opt: PollOption) => {
          const weightedVotes = opt.votes?.reduce((sum: number, v: { weight: number }) => sum + v.weight, 0) || 0;
          return {
            optionId: opt.id,
            title: opt.title || '',
            imageUrl: opt.imageUrl,
            totalVotes: opt.votes?.length || 0,
            weightedVotes
          };
        }).sort((a: ResultItem, b: ResultItem) => b.weightedVotes - a.weightedVotes);

        const winner = results[0];
        const isTie = results.length > 1 && results[0].weightedVotes === results[1].weightedVotes;

        // Si hay empate, el peso de los líderes ya debería haberlo resuelto
        // Si aún hay empate, se usa el que tiene más votos sin peso
        let finalWinner = winner;
        if (isTie) {
          const tiedOptions = results.filter((r: ResultItem) => r.weightedVotes === winner.weightedVotes);
          finalWinner = tiedOptions.sort((a: ResultItem, b: ResultItem) => b.totalVotes - a.totalVotes)[0];
        }

        // Cerrar la votación
        await prisma.tribePoll.update({
          where: { id: parseInt(pollId) },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            closedById: userId
          }
        });

        // Si es votación de LOGO o SHIRT, guardar el diseño ganador en la visión
        if (poll.category === 'LOGO' && finalWinner.imageUrl) {
          await prisma.vision.update({
            where: { id: poll.visionId },
            data: { tribeLogoUrl: finalWinner.imageUrl }
          });
          console.log(`[Tribe Poll] Logo ganador guardado para visión ${poll.visionId}: ${finalWinner.imageUrl}`);
        } else if (poll.category === 'SHIRT' && finalWinner.imageUrl) {
          await prisma.vision.update({
            where: { id: poll.visionId },
            data: { tribeShirtDesignUrl: finalWinner.imageUrl }
          });
          console.log(`[Tribe Poll] Diseño de playera ganador guardado para visión ${poll.visionId}: ${finalWinner.imageUrl}`);
        }

        // Contar participación final
        const tribeMembers = await prisma.tribeOath.count({
          where: { visionId: poll.visionId }
        });

        const totalVotes = poll.options.reduce((sum: number, opt: PollOption) => sum + (opt.votes?.length || 0), 0);
        const participationPercentage = tribeMembers > 0 
          ? Math.round((totalVotes / tribeMembers) * 100) 
          : 0;

        return NextResponse.json({
          success: true,
          message: isTie 
            ? `Votación cerrada. Hubo empate, ganó: ${finalWinner.title}` 
            : `Votación cerrada. Ganador: ${finalWinner.title}`,
          results,
          winner: finalWinner,
          isTie,
          logoSaved: poll.category === 'LOGO' && !!finalWinner.imageUrl,
          shirtSaved: poll.category === 'SHIRT' && !!finalWinner.imageUrl,
          stats: {
            tribeMembers,
            totalVotes,
            participationPercentage,
            quorumReached: participationPercentage >= poll.quorumPercentage
          }
        });
      }

      case 'cancel': {
        // Cancelar votación
        if (!pollId) {
          return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
        }

        const poll = await prisma.tribePoll.findUnique({
          where: { id: parseInt(pollId) }
        });

        if (!poll) {
          return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
        }

        // Verificar permisos
        const canManage = await checkPollPermissions(userId, poll.visionId, poll.createdById);
        if (!canManage) {
          return NextResponse.json({ error: 'No tienes permiso para cancelar esta votación' }, { status: 403 });
        }

        if (poll.status === 'CLOSED' || poll.status === 'CANCELLED') {
          return NextResponse.json({ error: 'La votación ya está cerrada o cancelada' }, { status: 400 });
        }

        await prisma.tribePoll.update({
          where: { id: parseInt(pollId) },
          data: {
            status: 'CANCELLED',
            closedAt: new Date(),
            closedById: userId
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Votación cancelada'
        });
      }

      case 'add_option': {
        // Agregar opción a una votación en borrador
        if (!pollId) {
          return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
        }

        const { title, description, imageUrl } = data;
        if (!title) {
          return NextResponse.json({ error: 'title requerido' }, { status: 400 });
        }

        const poll = await prisma.tribePoll.findUnique({
          where: { id: parseInt(pollId) },
          include: {
            _count: { select: { options: true } }
          }
        });

        if (!poll) {
          return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
        }

        if (poll.status !== 'DRAFT') {
          return NextResponse.json({ error: 'Solo se pueden agregar opciones a votaciones en borrador' }, { status: 400 });
        }

        // Verificar permisos
        const canManage = await checkPollPermissions(userId, poll.visionId, poll.createdById);
        if (!canManage) {
          return NextResponse.json({ error: 'No tienes permiso para modificar esta votación' }, { status: 403 });
        }

        if (poll._count.options >= poll.maxOptions) {
          return NextResponse.json({ error: `La votación no puede tener más de ${poll.maxOptions} opciones` }, { status: 400 });
        }

        const option = await prisma.tribePollOption.create({
          data: {
            pollId: parseInt(pollId),
            title,
            description,
            imageUrl,
            displayOrder: poll._count.options
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Opción agregada',
          option
        });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en tribe-polls POST:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para verificar permisos
async function checkPollPermissions(userId: number, visionId: number, creatorId: number): Promise<boolean> {
  // El creador siempre puede gestionar
  if (userId === creatorId) return true;

  // Staff puede gestionar
  const isStaff = await prisma.visionStaff.findFirst({
    where: {
      userId: userId,
      visionId: visionId
    }
  });

  return !!isStaff;
}
