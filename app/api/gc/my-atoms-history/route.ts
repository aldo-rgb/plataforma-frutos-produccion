import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/gc/my-atoms-history
 * Obtiene el historial de todos los átomos del Game Changer
 * Incluye átomos activos y finalizados
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener todos los squads donde este usuario es líder (activos e inactivos)
    const squads = await prisma.smallGroup.findMany({
      where: {
        leaderId: user.id,
      },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
          },
        },
        SmallGroupMember: {
          include: {
            Usuario_SmallGroupMember_userIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                imagen: true,
                email: true,
                telefono: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { SmallGroupMember: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Para cada squad, obtener estadísticas de llamadas
    const atomsWithStats = await Promise.all(
      squads.map(async (squad) => {
        // Obtener intentos de llamada para este squad
        let totalCalls = 0;
        let completedCalls = 0;
        let avgRating = 0;

        try {
          const attempts = await (prisma as any).gCCallAttempt.findMany({
            where: {
              squadId: squad.id,
            },
            select: {
              completed: true,
              potentialRating: true,
            },
          });

          totalCalls = attempts.length;
          completedCalls = attempts.filter((a: any) => a.completed).length;
          const ratingsWithValue = attempts.filter((a: any) => a.potentialRating);
          avgRating = ratingsWithValue.length > 0
            ? ratingsWithValue.reduce((sum: number, a: any) => sum + (a.potentialRating || 0), 0) / ratingsWithValue.length
            : 0;
        } catch (e) {
          logger.error('Error fetching call attempts for squad:', squad.id, e);
        }

        return {
          id: squad.id,
          name: squad.name,
          level: squad.level,
          isActive: squad.isActive,
          createdAt: squad.createdAt.toISOString(),
          closedAt: squad.closedAt?.toISOString() || null,
          vision: squad.vision
            ? {
                id: squad.vision.id,
                nombre: squad.vision.nombre,
                startDate: squad.vision.startDate?.toISOString() || null,
                endDate: squad.vision.endDate?.toISOString() || null,
                advancedStartDate: squad.vision.advancedStartDate?.toISOString() || null,
                advancedEndDate: squad.vision.advancedEndDate?.toISOString() || null,
              }
            : null,
          members: squad.SmallGroupMember.map((m) => ({
            id: m.id,
            odId: m.id,
            user: m.Usuario_SmallGroupMember_userIdToUsuario,
            joinedAt: m.joinedAt.toISOString(),
          })),
          membersCount: squad._count.SmallGroupMember,
          stats: {
            totalCalls,
            completedCalls,
            avgRating: Math.round(avgRating * 10) / 10,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      atoms: atomsWithStats,
    });
  } catch (error) {
    logger.error('Error fetching atoms history:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener historial' },
      { status: 500 }
    );
  }
}
