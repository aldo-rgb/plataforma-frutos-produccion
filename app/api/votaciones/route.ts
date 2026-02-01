import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener todas las votaciones del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Obtener las visiones donde el usuario participa
    const [memberSizes, ticketPurchases, staffAssignments, captainAssignments, visionEnrollments] = await Promise.all([
      prisma.tribeMemberSize.findMany({
        where: { userId },
        select: { visionId: true }
      }),
      prisma.ticketPurchase.findMany({
        where: { 
          userId: userId,
          status: { in: ['COMPLETED', 'REFUNDED'] }
        },
        select: { visionId: true }
      }),
      prisma.visionStaff.findMany({
        where: { userId },
        select: { visionId: true }
      }),
      prisma.tribeCaptainAssignment.findMany({
        where: { 
          userId,
          status: 'ACCEPTED'
        },
        include: {
          captaincy: {
            select: { visionId: true }
          }
        }
      }),
      // También incluir participantes de PL (vision_enrollments)
      prisma.vision_enrollments.findMany({
        where: { userId },
        select: { visionId: true }
      })
    ]);

    // Combinar todas las visiones únicas
    const visionIdsSet = new Set<number>();
    memberSizes.forEach(m => visionIdsSet.add(m.visionId));
    ticketPurchases.forEach(t => visionIdsSet.add(t.visionId));
    staffAssignments.forEach(s => visionIdsSet.add(s.visionId));
    captainAssignments.forEach(c => visionIdsSet.add(c.captaincy.visionId));
    visionEnrollments.forEach(e => visionIdsSet.add(e.visionId));

    const visionIds = Array.from(visionIdsSet);

    if (visionIds.length === 0) {
      return NextResponse.json({
        polls: [],
        visions: []
      });
    }

    // Obtener todas las votaciones de las visiones del usuario
    const polls = await prisma.tribePoll.findMany({
      where: {
        visionId: { in: visionIds }
      },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            },
            votes: {
              select: { weight: true }
            }
          },
          orderBy: { displayOrder: 'asc' }
        },
        vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        createdBy: {
          select: {
            id: true,
            nombre: true
          }
        },
        _count: {
          select: {
            votes: true,
            chatMessages: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE primero
        { createdAt: 'desc' }
      ]
    });

    // Verificar cuáles ya votó el usuario
    const userVotes = await prisma.tribePollVote.findMany({
      where: {
        userId: userId,
        pollId: { in: polls.map(p => p.id) }
      },
      select: { pollId: true }
    });

    const votedPollIds = new Set(userVotes.map(v => v.pollId));

    // Agregar hasVoted a cada poll
    const pollsWithVoteStatus = polls.map(poll => ({
      ...poll,
      hasVoted: votedPollIds.has(poll.id)
    }));

    // Obtener lista de visiones únicas
    const visions = await prisma.vision.findMany({
      where: {
        id: { in: visionIds }
      },
      select: {
        id: true,
        nombre: true
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json({
      polls: pollsWithVoteStatus,
      visions
    });

  } catch (error) {
    console.error('Error al obtener votaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
