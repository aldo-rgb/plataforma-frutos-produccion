import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    // Roles válidos de coordinador
    const coordinadorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    const tieneRolCoordinador = coordinadorRoles.includes(coordinador?.rol || '');
    const tieneFlagCoordinador = coordinador?.esCoordinador || coordinador?.esCoordinadorBasico || coordinador?.esCoordinadorAvanzado || coordinador?.esEntrenador;
    
    if (!coordinador || (!tieneRolCoordinador && !tieneFlagCoordinador)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener visiones del coordinador
    let visionesWhere: any = {};
    
    if (coordinador.organizationId) {
      visionesWhere.organizationId = coordinador.organizationId;
    } else {
      visionesWhere.coordinadorId = coordinador.id;
    }

    const visiones = await prisma.vision.findMany({
      where: visionesWhere,
      include: {
        Participantes: {
          include: {
            Participante: {
              include: {
                CartasFrutos: {
                  where: {
                    estado: 'APROBADA'
                  },
                  orderBy: {
                    updatedAt: 'desc'
                  },
                  take: 1
                }
              }
            }
          }
        },
        GameChangers: {
          include: {
            GameChanger: {
              include: {
                CartasFrutos: {
                  where: {
                    estado: 'APROBADA'
                  },
                  orderBy: {
                    updatedAt: 'desc'
                  },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    // Organizar por visión
    const visionesConCartas = visiones.map(vision => {
      const cartas: any[] = [];

      // Agregar cartas de participantes
      vision.Participantes.forEach(vp => {
        if (vp.Participante.CartasFrutos.length > 0) {
          cartas.push({
            id: vp.Participante.CartasFrutos[0].id,
            usuarioId: vp.Participante.id,
            usuario: {
              nombre: vp.Participante.nombre,
              email: vp.Participante.email
            },
            createdAt: vp.Participante.CartasFrutos[0].createdAt,
            updatedAt: vp.Participante.CartasFrutos[0].updatedAt
          });
        }
      });

      // Agregar cartas de game changers
      vision.GameChangers.forEach(vgc => {
        if (vgc.GameChanger.CartasFrutos.length > 0) {
          cartas.push({
            id: vgc.GameChanger.CartasFrutos[0].id,
            usuarioId: vgc.GameChanger.id,
            usuario: {
              nombre: vgc.GameChanger.nombre,
              email: vgc.GameChanger.email
            },
            createdAt: vgc.GameChanger.CartasFrutos[0].createdAt,
            updatedAt: vgc.GameChanger.CartasFrutos[0].updatedAt
          });
        }
      });

      return {
        visionId: vision.id,
        visionNombre: vision.nombre,
        cartas
      };
    }).filter(v => v.cartas.length > 0);

    return NextResponse.json({
      success: true,
      visiones: visionesConCartas
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo cartas aprobadas:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener cartas',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
