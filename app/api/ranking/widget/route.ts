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

    // Obtener el usuario actual con su visión activa y paquetes
    const currentUser = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          where: {
            Vision: {
              isActive: true
            }
          },
          include: {
            Vision: true
          }
        },
        MentorPackageOrder_MentorPackageOrder_usuarioIdToUsuario: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true,
            metadata: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar si es Lobo Solitario (sin visión pero con paquete completado)
    const activeVision = currentUser.VisionParticipante_VisionParticipante_participanteIdToUsuario[0]?.Vision;
    const hasLoboPackage = currentUser.MentorPackageOrder_MentorPackageOrder_usuarioIdToUsuario.some(
      (order: any) => order.metadata?.tipoCliente === 'LOBO_SOLITARIO'
    );
    
    if (!activeVision) {
      // Si no tiene visión activa, verificar si es Lobo Solitario
      if (hasLoboPackage) {
        // Lobo Solitario: mostrar mensaje personalizado
        return NextResponse.json({
          topUsers: [],
          userRank: null,
          currentUserId: userId,
          isLoboSolitario: true,
          userData: {
            nombre: currentUser.nombre,
            puntos: currentUser.puntosCuanticos || 0,
            xp: currentUser.experienciaXP || 0,
            avatar: currentUser.profileImage
          }
        });
      }
      
      // Usuario sin visión y sin paquete: devolver datos vacíos
      return NextResponse.json({
        topUsers: [],
        userRank: null,
        currentUserId: userId,
        isLoboSolitario: false
      });
    }

    // Obtener capitanías asignadas del usuario
    const captainAssignments = await prisma.tribeCaptainAssignment.findMany({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: activeVision.id,
          isActive: true
        }
      },
      include: {
        captaincy: {
          select: {
            roleType: true
          }
        }
      }
    });

    // Mapear nombres de capitanías
    const captaincyNames: Record<string, string> = {
      TRIBE_CAPTAIN: 'Capitán de Tribu',
      TRIBE_CO_CAPTAIN: 'Co-Capitán de Tribu',
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

    const userCaptaincies = captainAssignments.map(a => ({
      role: a.captaincy.roleType,
      name: captaincyNames[a.captaincy.roleType] || a.captaincy.roleType
    }));

    // Obtener todos los usuarios de la misma visión, ordenados por puntos
    const usersInVision = await prisma.usuario.findMany({
      where: {
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
      captaincies: userCaptaincies
    });

  } catch (error) {
    logger.error('❌ Error obteniendo datos de ranking:', error);
    return NextResponse.json(
      { error: 'Error obteniendo datos de ranking' },
      { status: 500 }
    );
  }
}
