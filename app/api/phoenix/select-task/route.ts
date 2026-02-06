import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, MicroTaskType } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * PROTOCOLO FÉNIX - SELECCIONAR MICRO-TAREA
 * 
 * El usuario elige qué micro-tarea quiere hacer
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
    const { phoenixSessionId, microTaskType } = body;

    if (!phoenixSessionId || !microTaskType) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Validar que la sesión pertenece al usuario
    const session_phoenix = await prisma.phoenixSession.findFirst({
      where: {
        id: phoenixSessionId,
        usuarioId
      }
    });

    if (!session_phoenix) {
      return NextResponse.json(
        { error: 'Sesión Fénix no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la sesión con la tarea elegida
    await prisma.phoenixSession.update({
      where: {
        id: phoenixSessionId
      },
      data: {
        microTaskType: microTaskType as MicroTaskType
      }
    });

    // Metadata de la tarea
    const taskMetadata: Record<MicroTaskType, any> = {
      DRINK_WATER: {
        title: '💧 Beber un vaso de agua',
        timer: 60, // 1 minuto
        instructions: 'Tómate un momento para hidratarte. Bebe un vaso completo de agua.',
        zenMessage: 'El agua es vida. Cada sorbo te devuelve al presente.'
      },
      READ_ONE_PAGE: {
        title: '📖 Leer 1 página',
        timer: 180, // 3 minutos
        instructions: 'Lee una página de cualquier libro. No importa cuál, solo lee.',
        zenMessage: 'La lectura abre nuevos mundos. Una página a la vez.'
      },
      BREATHE_TWO_MIN: {
        title: '🌬️ Respirar 2 minutos',
        timer: 120, // 2 minutos
        instructions: 'Inhala profundo por 4 segundos. Sostén 4 segundos. Exhala 6 segundos. Repite.',
        zenMessage: 'La respiración es el ancla. Vuelves a ti con cada inhalación.'
      },
      MAKE_BED: {
        title: '🛏️ Tender la cama',
        timer: 120, // 2 minutos
        instructions: 'Haz tu cama. Organiza las sábanas, acomoda las almohadas.',
        zenMessage: 'Pequeño orden afuera, gran paz adentro.'
      },
      WALK_5_MIN: {
        title: '🚶 Caminar 5 minutos',
        timer: 300, // 5 minutos
        instructions: 'Sal y camina 5 minutos. No necesitas ir lejos, solo muévete.',
        zenMessage: 'Cada paso es progreso. El movimiento libera la mente.'
      },
      STRETCH: {
        title: '🤸 Estirar el cuerpo',
        timer: 180, // 3 minutos
        instructions: 'Estira tus brazos, cuello, espalda. Libera la tensión física.',
        zenMessage: 'Tu cuerpo guarda tensión. Libérala y tu mente seguirá.'
      },
      CUSTOM: {
        title: '✨ Tarea personalizada',
        timer: 300,
        instructions: 'Define tu propia micro-tarea',
        zenMessage: 'Conoces lo que necesitas. Confía en ti.'
      }
    };

    return NextResponse.json({
      success: true,
      task: taskMetadata[microTaskType as MicroTaskType],
      message: 'Solo concéntrate en esto. Nada más importa ahora.'
    });

  } catch (error) {
    logger.error('Error selecting Phoenix task:', error);
    return NextResponse.json(
      { error: 'Error al seleccionar tarea' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
