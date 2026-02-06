// API Route: Get shirt sizes from poll votes
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const visionId = searchParams.get('visionId');

    if (!pollId && !visionId) {
      return NextResponse.json({ error: 'Se requiere pollId o visionId' }, { status: 400 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Si se especifica pollId, obtener tallas de esa votación
    if (pollId) {
      const poll = await prisma.tribePoll.findUnique({
        where: { id: parseInt(pollId) },
        include: {
          votes: {
            where: { shirtSize: { not: null } },
            include: {
              user: {
                select: {
                  id: true,
                  nombre: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!poll) {
        return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
      }

      // Verificar permisos (capitán o staff)
      const isStaff = await prisma.visionStaff.findFirst({
        where: { userId, visionId: poll.visionId }
      });

      const isCaptain = await prisma.tribeCaptainAssignment.findFirst({
        where: {
          userId,
          status: 'ACCEPTED',
          captaincy: { visionId: poll.visionId }
        }
      });

      if (!isStaff && !isCaptain) {
        return NextResponse.json({ error: 'No tienes permiso para ver esta información' }, { status: 403 });
      }

      // Agrupar por talla
      const sizeCount: Record<string, number> = {};
      const sizeDetails: Record<string, Array<{ userId: number; nombre: string; email: string }>> = {};

      poll.votes.forEach((vote: { shirtSize: string | null; user: { id: number; nombre: string; email: string } }) => {
        if (vote.shirtSize) {
          sizeCount[vote.shirtSize] = (sizeCount[vote.shirtSize] || 0) + 1;
          if (!sizeDetails[vote.shirtSize]) {
            sizeDetails[vote.shirtSize] = [];
          }
          sizeDetails[vote.shirtSize].push({
            userId: vote.user.id,
            nombre: vote.user.nombre,
            email: vote.user.email
          });
        }
      });

      // Ordenar por talla
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const orderedSizes = sizeOrder
        .filter(size => sizeCount[size])
        .map(size => ({
          size,
          count: sizeCount[size],
          users: sizeDetails[size]
        }));

      return NextResponse.json({
        success: true,
        pollId: poll.id,
        pollTitle: poll.title,
        totalWithSize: poll.votes.length,
        sizes: orderedSizes,
        summary: sizeCount
      });
    }

    // Si se especifica visionId, obtener todas las tallas de todas las votaciones SHIRT
    if (visionId) {
      // Verificar permisos
      const isStaff = await prisma.visionStaff.findFirst({
        where: { userId, visionId: parseInt(visionId) }
      });

      const isCaptain = await prisma.tribeCaptainAssignment.findFirst({
        where: {
          userId,
          status: 'ACCEPTED',
          captaincy: { visionId: parseInt(visionId) }
        }
      });

      if (!isStaff && !isCaptain) {
        return NextResponse.json({ error: 'No tienes permiso para ver esta información' }, { status: 403 });
      }

      // Obtener todas las votaciones de playera o logo cerradas (o activas para LOGO)
      const shirtPolls = await prisma.tribePoll.findMany({
        where: {
          visionId: parseInt(visionId),
          category: { in: ['SHIRT', 'LOGO'] }
        },
        include: {
          votes: {
            where: { shirtSize: { not: null } },
            include: {
              user: {
                select: {
                  id: true,
                  nombre: true,
                  email: true,
                  profileImage: true
                }
              }
            }
          }
        }
      });

      // Consolidar todas las tallas (usar la más reciente si hay duplicados)
      const userSizes: Record<number, { size: string; nombre: string; email: string; profileImage: string | null }> = {};

      shirtPolls.forEach(poll => {
        poll.votes.forEach((vote: { shirtSize: string | null; userId: number; user: { id: number; nombre: string; email: string; profileImage: string | null } }) => {
          if (vote.shirtSize) {
            // Solo guardar si no existe o si este voto es más reciente
            userSizes[vote.userId] = {
              size: vote.shirtSize,
              nombre: vote.user.nombre,
              email: vote.user.email,
              profileImage: vote.user.profileImage
            };
          }
        });
      });

      // Agrupar por talla
      const sizeCount: Record<string, number> = {};
      const sizeDetails: Record<string, Array<{ userId: number; nombre: string; email: string; profileImage: string | null }>> = {};

      Object.entries(userSizes).forEach(([odUserId, data]) => {
        sizeCount[data.size] = (sizeCount[data.size] || 0) + 1;
        if (!sizeDetails[data.size]) {
          sizeDetails[data.size] = [];
        }
        sizeDetails[data.size].push({
          userId: parseInt(odUserId),
          nombre: data.nombre,
          email: data.email,
          profileImage: data.profileImage
        });
      });

      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const orderedSizes = sizeOrder
        .filter(size => sizeCount[size])
        .map(size => ({
          size,
          count: sizeCount[size],
          users: sizeDetails[size]
        }));

      return NextResponse.json({
        success: true,
        visionId: parseInt(visionId),
        totalMembers: Object.keys(userSizes).length,
        sizes: orderedSizes,
        summary: sizeCount
      });
    }

  } catch (error) {
    logger.error('Error getting shirt sizes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
