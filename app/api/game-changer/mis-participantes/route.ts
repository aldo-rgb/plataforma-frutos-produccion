import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Game Changer ve sus participantes asignados
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (usuario?.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'Solo Game Changers pueden acceder' }, { status: 403 });
    }

    // Obtener todas las visiones donde está asignado como Game Changer
    const visionesGC = await prisma.visionGameChanger.findMany({
      where: { gameChangerId: usuario.id },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            descripcion: true
          }
        }
      }
    });

    // Obtener todos los participantes asignados a este Game Changer
    const participantes = await prisma.visionParticipante.findMany({
      where: { gameChangerId: usuario.id },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        Participante: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true,
            completionStreak: true,
            nivelActual: true,
            lastCompletionDate: true,
            experienciaXP: true,
            rangoActual: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Obtener estadísticas de cada participante
    const participantesConStats = await Promise.all(
      participantes.map(async (p) => {
        const [tareasCompletadas, tareasTotal, phoenixSessions] = await Promise.all([
          prisma.taskInstance.count({
            where: {
              usuarioId: p.participanteId,
              status: 'COMPLETED'
            }
          }),
          prisma.taskInstance.count({
            where: {
              usuarioId: p.participanteId
            }
          }),
          prisma.phoenixSession.count({
            where: {
              usuarioId: p.participanteId,
              microTaskCompleted: true
            }
          })
        ]);

        // Calcular días desde última actividad
        const ultimaActividad = p.Participante.lastCompletionDate;
        const diasInactivo = ultimaActividad 
          ? Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        return {
          ...p,
          stats: {
            tareasCompletadas,
            tareasTotal,
            tasasCompletamiento: tareasTotal > 0 
              ? Math.round((tareasCompletadas / tareasTotal) * 100) 
              : 0,
            phoenixActivaciones: phoenixSessions,
            diasInactivo,
            estado: diasInactivo === 0 ? 'ACTIVO_HOY' 
                  : diasInactivo <= 3 ? 'ACTIVO' 
                  : diasInactivo <= 7 ? 'EN_RIESGO' 
                  : 'INACTIVO'
          }
        };
      })
    );

    return NextResponse.json({ 
      visiones: visionesGC,
      participantes: participantesConStats,
      totalParticipantes: participantes.length
    });

  } catch (error) {
    console.error('Error loading mis participantes:', error);
    return NextResponse.json({ error: 'Error al cargar participantes' }, { status: 500 });
  }
}
