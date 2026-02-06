import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    // Roles válidos de coordinador
    const coordinadorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    
    // Verificar si tiene rol de coordinador O algún flag de coordinador
    const tieneRolCoordinador = coordinadorRoles.includes(usuario?.rol || '');
    const tieneFlagCoordinador = usuario?.esCoordinador || usuario?.esCoordinadorBasico || usuario?.esCoordinadorAvanzado || usuario?.esEntrenador;
    
    if (!usuario || (!tieneRolCoordinador && !tieneFlagCoordinador)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    logger.debug('🔍 Coordinador', usuario.id, 'cargando usuarios');

    // Obtener IDs de visiones donde el coordinador está asignado
    const visiones = await prisma.vision.findMany({
      where: {
        coordinadorId: usuario.id
      },
      select: {
        id: true
      }
    });
    
    const visionIds = visiones.map(v => v.id);

    logger.debug('📊 Visiones del coordinador:', visionIds);

    if (visionIds.length === 0) {
      return NextResponse.json({
        success: true,
        usuarios: []
      });
    }

    // Obtener todos los usuarios de esas visiones a través de las tablas intermedias
    const usuarios = await prisma.usuario.findMany({
      where: {
        AND: [
          {
            rol: {
              in: ['PARTICIPANTE', 'GAMECHANGER']
            }
          },
          {
            OR: [
              {
                VisionParticipante_VisionParticipante_participanteIdToUsuario: {
                  some: {
                    visionId: { in: visionIds }
                  }
                }
              },
              {
                VisionGameChanger_VisionGameChanger_gameChangerIdToUsuario: {
                  some: {
                    visionId: { in: visionIds }
                  }
                }
              }
            ]
          }
        ]
      },
      include: {
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          where: {
            visionId: { in: visionIds }
          },
          include: {
            Vision: {
              select: {
                nombre: true
              }
            }
          },
          take: 1
        },
        VisionGameChanger_VisionGameChanger_gameChangerIdToUsuario: {
          where: {
            visionId: { in: visionIds }
          },
          include: {
            Vision: {
              select: {
                nombre: true
              }
            }
          },
          take: 1
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    logger.debug('✅ Usuarios encontrados:', usuarios.length);

    return NextResponse.json({
      success: true,
      usuarios: usuarios.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        vision: u.VisionParticipante_VisionParticipante_participanteIdToUsuario[0]?.Vision?.nombre || 
                u.VisionGameChanger_VisionGameChanger_gameChangerIdToUsuario[0]?.Vision?.nombre || 
                'Sin visión'
      }))
    });
  } catch (error) {
    logger.error('❌ Error fetching coordinador usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
