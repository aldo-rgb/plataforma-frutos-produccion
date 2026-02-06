import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener slots bloqueados del mentor
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const mentorId = typeof session.user.id === 'number' ? session.user.id : parseInt(session.user.id as string);

    const blockedSlots = await prisma.disciplineBlockedSlot.findMany({
      where: { mentorId },
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      blockedSlots,
    });
  } catch (error) {
    logger.error('Error obteniendo slots bloqueados:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener slots bloqueados' },
      { status: 500 }
    );
  }
}

// POST - Guardar slots bloqueados para un día específico
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const mentorId = typeof session.user.id === 'number' ? session.user.id : parseInt(session.user.id as string);
    const body = await request.json();
    const { dayOfWeek, blockedTimes } = body;

    if (dayOfWeek === undefined || !Array.isArray(blockedTimes)) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Eliminar slots existentes para ese día
    await prisma.disciplineBlockedSlot.deleteMany({
      where: {
        mentorId,
        dayOfWeek,
      },
    });

    // Crear nuevos slots bloqueados
    if (blockedTimes.length > 0) {
      await prisma.disciplineBlockedSlot.createMany({
        data: blockedTimes.map((time: string) => ({
          mentorId,
          dayOfWeek,
          time,
        })),
      });
    }

    // Obtener los slots actualizados
    const updatedSlots = await prisma.disciplineBlockedSlot.findMany({
      where: { mentorId },
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      message: 'Slots bloqueados actualizados',
      blockedSlots: updatedSlots,
    });
  } catch (error) {
    logger.error('Error guardando slots bloqueados:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar slots bloqueados' },
      { status: 500 }
    );
  }
}
