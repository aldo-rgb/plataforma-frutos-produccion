import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/gc-calls/my-post-entreno-all
 * Obtener TODAS las llamadas post-entreno agendadas del participante
 * (máximo 2, fuera del horario de staff 7:00-9:30)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar todas las llamadas agendadas del participante
    const allSlots = await prisma.gCCallSlot.findMany({
      where: {
        participantId: user.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledDate: { gte: today },
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' },
      ],
      select: {
        id: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
      },
    });

    // Filtrar las que son post-entreno (fuera del horario 07:00-09:30)
    const postEntrenoSlots = allSlots.filter(slot => {
      const [hours, minutes] = slot.scheduledTime.split(':').map(Number);
      const timeMinutes = hours * 60 + minutes;
      // Staff es 7:00 (420 min) a 9:30 (570 min)
      return timeMinutes < 420 || timeMinutes >= 570;
    });

    return NextResponse.json({
      success: true,
      bookings: postEntrenoSlots.map(slot => ({
        id: slot.id,
        date: slot.scheduledDate.toISOString().split('T')[0],
        time: slot.scheduledTime,
        status: slot.status,
      })),
      total: postEntrenoSlots.length,
    });

  } catch (error) {
    logger.error('Error fetching post-entreno bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener llamadas' },
      { status: 500 }
    );
  }
}
