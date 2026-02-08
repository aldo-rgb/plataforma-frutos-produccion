import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


/**
 * PROTOCOLO FÉNIX - ESTADO
 * 
 * Verifica si hay una sesión Fénix activa
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const usuarioId = session.user.id as number;

    // Buscar sesión activa (no completada)
    const activeSession = await prisma.phoenixSession.findFirst({
      where: {
        usuarioId,
        microTaskCompleted: false,
        exitedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!activeSession) {
      return NextResponse.json({
        isActive: false,
        message: 'No hay sesión Fénix activa'
      });
    }

    return NextResponse.json({
      isActive: true,
      session: {
        id: activeSession.id,
        microTaskType: activeSession.microTaskType,
        tasksRescheduled: activeSession.tasksRescheduled,
        tasksPerdonadas: activeSession.tasksGracefullySkipped,
        createdAt: activeSession.createdAt
      }
    });

  } catch (error) {
    logger.error('Error checking Phoenix status:', error);
    return NextResponse.json(
      { error: 'Error al verificar estado' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
