import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
      select: {
        id: true,
        nombre: true,
        puntosCuanticos: true,
        experienciaXP: true,
        profileImage: true,
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
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

    // Datos básicos del usuario (siempre disponibles)
    const userData = {
      nombre: currentUser.nombre,
      puntos: currentUser.puntosCuanticos || 0,
      xp: currentUser.experienciaXP || 0,
      avatar: currentUser.profileImage
    };

    // Verificar si tiene visión activa
    const activeVision = currentUser.VisionParticipante_VisionParticipante_participanteIdToUsuario[0]?.Vision;
    
    if (!activeVision) {
      // Usuario sin visión: devolver datos básicos con sus puntos
      return NextResponse.json({
        topUsers: [],
        userRank: null,
        currentUserId: userId,
        isLoboSolitario: false,
        userData,
        captaincies: []
      });
    }

    // Obtener capitanías asignadas del usuario
    let userCaptaincies: Array<{ role: string; name: string }> = [];
    try {
      const captainAssignments = await prisma.tribeCaptainAssignment.findMany({
        where: {
          userId: userId,
          status: 'ACCEPTED',
          TribeCaptaincy: {
            visionId: activeVision.id,
            isActive: true
          }
        },
        include: {
          TribeCaptaincy: {
            select: {
              roleType: true
            }
          }
        }
      });

      // Mapear nombres de capitanías
      const captaincyNames: Record<string, string> = {
        TRIBE_CAPTAIN: 'Capitán de Tribu',
        TRIBE_CO_CAPTAIN: 'Co-Capitán',
        TREASURER: 'Tesorero',
        SHIRTS_LOGO: 'Playeras y Logo',
        CONTRIBUTION_BASIC: 'Contribución Básicos',
        CONTRIBUTION_ADVANCED: 'Contribución Avanzados',
        COMMUNITY_SERVICE: 'Comunitaria Grupal',
        BOOKS_MOVIES: 'Libros y Películas',
        FOOD: 'Comidas',
        CLEANLINESS: 'Vestimenta y Limpieza',
        CONTEXT_GUARDIAN: 'Guardián del Contexto',
        GRADUATION_CAPTAIN: 'Capitán de Graduación'
      };

      userCaptaincies = captainAssignments.map(a => ({
        role: a.TribeCaptaincy.roleType,
        name: captaincyNames[a.TribeCaptaincy.roleType] || a.TribeCaptaincy.roleType
      }));
    } catch (captainError) {
      logger.warn('⚠️ Error obteniendo capitanías:', captainError);
      // Continuar sin capitanías
    }

    // Obtener todos los usuarios ACTIVOS de la misma visión, ordenados por puntos
    const usersInVision = await prisma.usuario.findMany({
      where: {
        isActive: true,
        rol: { in: ['PARTICIPANTE', 'GAMECHANGER'] },
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
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
        puntosCuanticos: true,
        profileImage: true,
        experienciaXP: true
      },
      orderBy: {
        puntosCuanticos: 'desc'
      }
    });

    // Obtener el top 3
    const topUsers = usersInVision.slice(0, 3).map((user, index) => ({
      id: user.id,
      nombre: user.nombre,
      puntos: user.puntosCuanticos || 0,
      position: index + 1,
      avatar: user.profileImage,
      xp: user.experienciaXP || 0
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
      currentUserId: userId,
      userData,
      captaincies: userCaptaincies
    });

  } catch (error) {
    logger.error('❌ Error obteniendo datos de ranking:', error);
    return NextResponse.json(
      { error: 'Error obteniendo datos de ranking', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
