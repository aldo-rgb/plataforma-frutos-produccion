import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const coordinadorId = parseInt(session.user.id);

    // Verificar que el usuario sea coordinador o director
    const usuario = await prisma.usuario.findUnique({
      where: { id: coordinadorId },
      select: { rol: true, organizationId: true }
    });

    if (!usuario || !['COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(usuario.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    let whereClause: any = {};

    if (usuario.rol === 'COORDINADOR') {
      // Obtener visiones del coordinador
      const visiones = await prisma.vision.findMany({
        where: { coordinadorId },
        select: { id: true }
      });

      const visionIds = visiones.map(v => v.id);

      logger.debug('🔍 Coordinador - Visiones encontradas:', visionIds);

      whereClause = {
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        },
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
      };
    } else {
      // Director ve toda su organización
      logger.debug('🔍 Director/School Admin - Organization ID:', usuario.organizationId);
      whereClause = {
        organizationId: usuario.organizationId,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        }
      };
    }

    logger.debug('🔍 Where clause:', JSON.stringify(whereClause, null, 2));

    // Obtener todos los participantes con información de llamadas
    const participantes = await prisma.usuario.findMany({
      where: whereClause,
      include: {
        Usuario_Usuario_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        },
        CallBooking_CallBooking_studentIdToUsuario: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            scheduledAt: 'desc'
          },
          take: 1
        },
        CallLog_CallLog_studentIdToUsuario: {
          select: {
            id: true,
            status: true,
            callDate: true,
            createdAt: true
          },
          orderBy: {
            callDate: 'desc'
          }
        },
        CartaFrutos: {
          select: {
            id: true,
            estado: true
          },
          orderBy: {
            fechaActualizacion: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Procesar información de strikes y status
    const participantesConInfo = participantes.map(p => {
      const ultimaLlamada = p.CallBooking_CallBooking_studentIdToUsuario[0];
      const llamadasCompletadas = p.CallLog_CallLog_studentIdToUsuario.filter(
        log => log.status === 'COMPLETED'
      ).length;
      const llamadasPerdidas = p.missedCallsCount || 0;
      const strikesPorLlamadas = Math.floor(llamadasPerdidas / 3);
      
      // Calcular strikes totales
      const totalStrikes = strikesPorLlamadas;
      const vidasExtra = Math.max(0, 3 - totalStrikes);

      // Determinar status de llamadas
      let statusLlamada: string;
      if (!ultimaLlamada) {
        statusLlamada = 'NO_AGENDADA';
      } else if (ultimaLlamada.status === 'PENDING') {
        statusLlamada = 'AGENDADA';
      } else if (ultimaLlamada.status === 'COMPLETED') {
        statusLlamada = 'COMPLETADA';
      } else if (ultimaLlamada.status === 'CANCELLED' || ultimaLlamada.status === 'MISSED') {
        statusLlamada = 'PERDIDA';
      } else {
        statusLlamada = 'DESCONOCIDO';
      }

      // Determinar si ha iniciado el programa
      const haIniciado = p.CartaFrutos.length > 0 && p.CartaFrutos[0].estado !== 'BORRADOR';

      return {
        id: p.id,
        nombre: p.nombre,
        email: p.email,
        rol: p.rol,
        mentor: p.Usuario_Usuario_mentorIdToUsuario?.nombre || null,
        mentorId: p.mentorId,
        llamadasPerdidas,
        llamadasCompletadas,
        totalStrikes,
        vidasExtra,
        statusLlamada,
        proximaLlamada: ultimaLlamada?.scheduledAt || null,
        haIniciado,
        cartaEstado: p.CartaFrutos[0]?.estado || null
      };
    });

    logger.debug('✅ Participantes encontrados:', participantesConInfo.length);

    return NextResponse.json({
      success: true,
      participantes: participantesConInfo
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo strikes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener información de strikes',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
