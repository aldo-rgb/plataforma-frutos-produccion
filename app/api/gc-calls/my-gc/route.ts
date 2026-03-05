import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/gc-calls/my-gc
 * Obtener información del Game Changer asignado al participante actual
 * y sus próximas llamadas agendadas
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar membresía activa en un squad
    const membership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        SmallGroup: {
          include: {
            Usuario: {
              select: {
                id: true,
                nombre: true,
                imagen: true,
                email: true,
              },
            },
            Vision: {
              select: {
                id: true,
                nombre: true,
                startDate: true,
                endDate: true,
                advancedStartDate: true,
                advancedEndDate: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({
        success: true,
        hasGC: false,
        message: 'No tienes un Game Changer asignado aún',
      });
    }

    const gc = membership.SmallGroup.Usuario;
    const vision = membership.SmallGroup.Vision;
    const squadId = membership.SmallGroup.id;
    const squadLevel = membership.SmallGroup.level; // 'BASIC' o 'ADVANCED'

    // Determinar las fechas de entrenamiento según el nivel del squad
    let trainingStartDate: Date | null = null;
    let trainingEndDate: Date | null = null;

    if (squadLevel === 'ADVANCED' && vision?.advancedStartDate && vision?.advancedEndDate) {
      trainingStartDate = new Date(vision.advancedStartDate);
      trainingEndDate = new Date(vision.advancedEndDate);
    } else if (vision?.startDate && vision?.endDate) {
      trainingStartDate = new Date(vision.startDate);
      trainingEndDate = new Date(vision.endDate);
    }

    // Calcular día actual del entrenamiento y si corresponde llamada de staff
    // Básico: 3 días - Día 1 llegan, Días 2 y 3 llamada de staff
    // Avanzado: 4 días - Día 1 llegan, Días 2, 3 y 4 llamada de staff
    let trainingDay: number | null = null;
    let isStaffCallDay = false;
    let totalTrainingDays = squadLevel === 'ADVANCED' ? 4 : 3;
    let staffCallDays: number[] = squadLevel === 'ADVANCED' ? [2, 3, 4] : [2, 3];

    if (trainingStartDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const start = new Date(trainingStartDate);
      start.setHours(0, 0, 0, 0);
      
      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      trainingDay = diffDays + 1; // Día 1 es el primer día
      
      // Verificar si hoy es día de llamada de staff
      if (trainingDay >= 1 && trainingDay <= totalTrainingDays) {
        isStaffCallDay = staffCallDays.includes(trainingDay);
      }
    }

    // Buscar el horario programado del participante (su preferencia de hora)
    const myScheduledSlot = await prisma.gCCallSlot.findFirst({
      where: {
        participantId: user.id,
      },
      select: {
        id: true,
        scheduledTime: true,
      },
      orderBy: {
        bookedAt: 'desc',
      },
    });

    // Buscar llamadas ya agendadas del participante
    const myBookedCalls = await prisma.gCCallSlot.findMany({
      where: {
        participantId: user.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledDate: { gte: new Date() },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });

    // Buscar disponibilidad del GC para hoy y los próximos días
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availabilities = await prisma.gCAvailability.findMany({
      where: {
        gameChangerId: gc.id,
        isActive: true,
        OR: [
          { squadId: null }, // Disponibilidad general
          { squadId }, // Disponibilidad específica para este squad
        ],
      },
      select: {
        id: true,
        dayOfWeek: true,
        specificDate: true,
        startTime: true,
        endTime: true,
        slotDuration: true,
      },
    });

    // Calcular próxima fecha disponible
    let nextAvailableDate: string | null = null;
    const daysToCheck = 7;

    for (let i = 0; i < daysToCheck && !nextAvailableDate; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      const dayOfWeek = checkDate.getDay();

      const hasAvailability = availabilities.some(
        (a) =>
          a.dayOfWeek === dayOfWeek ||
          (a.specificDate &&
            a.specificDate.toDateString() === checkDate.toDateString())
      );

      if (hasAvailability) {
        nextAvailableDate = checkDate.toISOString().split('T')[0];
      }
    }

    // Verificar si hay llamada para hoy
    const todayStr = today.toISOString().split('T')[0];
    const todayCall = myBookedCalls.find(
      (c) => c.scheduledDate.toISOString().split('T')[0] === todayStr
    );

    return NextResponse.json({
      success: true,
      hasGC: true,
      gameChanger: {
        id: gc.id,
        nombre: gc.nombre,
        imagen: gc.imagen,
      },
      squad: {
        id: squadId,
        level: squadLevel,
      },
      // Horario programado del participante (su preferencia de hora para todos los días)
      myScheduledTime: myScheduledSlot?.scheduledTime || null,
      // Fechas de entrenamiento según el nivel del participante
      trainingDates: trainingStartDate && trainingEndDate
        ? {
            startDate: trainingStartDate.toISOString().split('T')[0],
            endDate: trainingEndDate.toISOString().split('T')[0],
          }
        : null,
      // Información del día de entrenamiento y llamadas de staff
      trainingInfo: {
        currentDay: trainingDay,
        totalDays: totalTrainingDays,
        isStaffCallDay,
        staffCallDays, // [2,3] para básico, [2,3,4] para avanzado
        level: squadLevel,
      },
      vision: vision
        ? {
            id: vision.id,
            nombre: vision.nombre,
          }
        : null,
      todayCall: todayCall
        ? {
            id: todayCall.id,
            time: todayCall.scheduledTime,
            status: todayCall.status,
          }
        : null,
      upcomingCalls: myBookedCalls.map((c) => ({
        id: c.id,
        date: c.scheduledDate.toISOString().split('T')[0],
        time: c.scheduledTime,
        status: c.status,
      })),
      nextAvailableDate,
      hasAvailability: availabilities.length > 0,
    });
  } catch (error) {
    logger.error('Error fetching my GC:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener información del GC' },
      { status: 500 }
    );
  }
}
