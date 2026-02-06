import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/game-changer/squads
 * Obtiene los squads donde el usuario es líder (Game Changer)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener todos los squads donde el usuario es líder
    const squads = await prisma.smallGroup.findMany({
      where: {
        leaderId: user.id,
        isActive: true
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
            plWeekend1StartDate: true,
            plWeekend1EndDate: true,
            plWeekend2StartDate: true,
            plWeekend2EndDate: true,
            plWeekend3StartDate: true,
            plWeekend3EndDate: true
          }
        },
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                email: true,
                image: true,
                telefono: true
              }
            }
          }
        }
      },
      orderBy: [
        { level: 'desc' }, // PL primero, luego ADVANCED, luego BASIC
        { createdAt: 'desc' }
      ]
    });

    // Formatear la respuesta
    const formattedSquads = squads.map(squad => ({
      id: squad.id,
      name: squad.name,
      level: squad.level,
      visionId: squad.visionId,
      maxSize: squad.maxSize,
      membersCount: squad.members.length,
      vision: squad.vision,
      members: squad.members.map(m => ({
        id: m.id,
        userId: m.userId,
        user: m.user,
        joinedAt: m.joinedAt
      }))
    }));

    return NextResponse.json({
      success: true,
      squads: formattedSquads
    });

  } catch (error) {
    logger.error('Error fetching GC squads:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
