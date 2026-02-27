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
      where: { email: session.user.email }
    });

    if (!usuario || (usuario.rol !== 'DIRECTOR' && usuario.rol !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!usuario.organizationId) {
      return NextResponse.json({ error: 'Director sin organización asignada' }, { status: 400 });
    }

    logger.debug('🔍 Director', usuario.id, 'cargando usuarios de organización', usuario.organizationId);

    // Obtener todos los usuarios (PARTICIPANTE y GAMECHANGER) de la organización del director
    const usuarios = await prisma.usuario.findMany({
      where: {
        organizationId: usuario.organizationId,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        }
      },
      include: {
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          include: {
            Vision: {
              select: {
                nombre: true
              }
            }
          },
          take: 1
        },
        GameChangerEnVisiones: {
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
                u.GameChangerEnVisiones[0]?.Vision?.nombre || 
                'Sin visión'
      }))
    });
  } catch (error) {
    logger.error('❌ Error fetching director usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
