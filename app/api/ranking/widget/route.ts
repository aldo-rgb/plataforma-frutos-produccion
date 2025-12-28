import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ranking/widget
 * Obtiene el top 3 de usuarios y la posición del usuario actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Obtener el usuario actual con su visión activa
    const currentUser = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        ParticipanteEnVisiones: {
          where: {
            Vision: {
              isActive: true
            }
          },
          include: {
            Vision: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener la visión activa del usuario
    const activeVision = currentUser.ParticipanteEnVisiones[0]?.Vision;
    
    if (!activeVision) {
      // Si no tiene visión activa, devolver datos vacíos
      return NextResponse.json({
        topUsers: [],
        userRank: null,
        currentUserId: userId
      });
    }

    // Obtener todos los usuarios de la misma visión, ordenados por puntos
    const usersInVision = await prisma.usuario.findMany({
      where: {
        ParticipanteEnVisiones: {
          some: {
            visionId: activeVision.id,
            Vision: {
              isActive: true
            }
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        quantumPoints: true
      },
      orderBy: {
        quantumPoints: 'desc'
      }
    });

    // Obtener el top 3
    const topUsers = usersInVision.slice(0, 3).map((user, index) => ({
      id: user.id,
      nombre: user.nombre,
      puntos: user.quantumPoints || 0,
      position: index + 1
    }));

    // Encontrar la posición del usuario actual
    const userPosition = usersInVision.findIndex(u => u.id === userId) + 1;
    const totalUsers = usersInVision.length;

    return NextResponse.json({
      topUsers,
      userRank: userPosition > 0 ? {
        position: userPosition,
        total: totalUsers
      } : null,
      currentUserId: userId
    });

  } catch (error) {
    console.error('❌ Error obteniendo datos de ranking:', error);
    return NextResponse.json(
      { error: 'Error obteniendo datos de ranking' },
      { status: 500 }
    );
  }
}
