import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


/**
 * PROTOCOLO FÉNIX - COMPLETAR MICRO-TAREA
 * 
 * Marca la micro-tarea como completada y otorga el badge Fénix
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const usuarioId = session.user.id as number;
    const body = await req.json();
    const { phoenixSessionId } = body;

    if (!phoenixSessionId) {
      return NextResponse.json(
        { error: 'Falta phoenixSessionId' },
        { status: 400 }
      );
    }

    // Validar que la sesión pertenece al usuario
    const phoenixSession = await prisma.phoenixSession.findFirst({
      where: {
        id: phoenixSessionId,
        usuarioId
      }
    });

    if (!phoenixSession) {
      return NextResponse.json(
        { error: 'Sesión Fénix no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar sesión y otorgar badge
    const [updatedSession, updatedUser] = await prisma.$transaction([
      // Marcar micro-tarea como completada
      prisma.phoenixSession.update({
        where: {
          id: phoenixSessionId
        },
        data: {
          microTaskCompleted: true,
          completedAt: new Date(),
          badgeAwarded: true,
          exitedAt: new Date()
        }
      }),
      
      // Agregar badge "Fénix" si no lo tiene
      prisma.usuario.update({
        where: {
          id: usuarioId
        },
        data: {
          badges: {
            push: 'PHOENIX_RISE'
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Día Reiniciado. Estás de vuelta en control. 🔥',
      badge: {
        name: 'Fénix',
        icon: '🔥',
        description: 'Reconocimiento por no rendirse en momentos difíciles',
        rarity: 'HONOR'
      },
      session: {
        tasksRescheduled: phoenixSession.tasksRescheduled,
        tasksPerdonadas: phoenixSession.tasksGracefullySkipped,
        microTaskCompleted: true
      }
    });

  } catch (error) {
    logger.error('Error completing Phoenix task:', error);
    return NextResponse.json(
      { error: 'Error al completar tarea Fénix' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
