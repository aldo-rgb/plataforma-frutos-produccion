import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultAvailability } from '@/lib/gcDefaultAvailability';

/**
 * GET /api/gc-calls/slots
 * Obtener slots disponibles de un GC para una fecha
 * Si el GC no tiene disponibilidad, se crea la por defecto (Lun-Jue 6-8 AM)
 * Query: gameChangerId, date, squadId (opcional)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gameChangerId = searchParams.get('gameChangerId');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const squadId = searchParams.get('squadId');

    if (!gameChangerId || !dateStr) {
      return NextResponse.json({
        success: false,
        error: 'gameChangerId y date son requeridos',
      }, { status: 400 });
    }

    const gcId = parseInt(gameChangerId);

    // Asegurar que el GC tenga disponibilidad por defecto
    await ensureDefaultAvailability(gcId);

    // Parsear la fecha correctamente para evitar problemas de timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day); // Mes es 0-indexed
    const dayOfWeek = targetDate.getDay(); // 0=Domingo, 1=Lunes, etc.
    
    console.log(`📅 Slots request: date=${dateStr}, dayOfWeek=${dayOfWeek}, gcId=${gcId}`);

    // Buscar disponibilidad por día de la semana O fecha específica
    const availabilities = await prisma.gCAvailability.findMany({
      where: {
        gameChangerId: gcId,
        isActive: true,
        ...(squadId && { squadId }),
        OR: [
          { dayOfWeek },
          { specificDate: targetDate },
        ],
      },
      include: {
        bookedSlots: {
          where: {
            scheduledDate: targetDate,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
          },
          select: { scheduledTime: true },
        },
      },
    });

    console.log(`📅 Found ${availabilities.length} availabilities for GC ${gcId}, dayOfWeek ${dayOfWeek}`);
    if (availabilities.length > 0) {
      console.log(`📅 Times:`, availabilities.map(a => `${a.startTime}-${a.endTime}`));
    }

    if (availabilities.length === 0) {
      console.log(`📅 No availabilities found for dayOfWeek=${dayOfWeek}`);
      return NextResponse.json({
        success: true,
        availableSlots: [],
        message: 'No hay disponibilidad para esta fecha',
      });
    }

    // Generar todos los slots posibles y filtrar los ya reservados
    const allSlots: { time: string; availabilityId: string }[] = [];

    for (const avail of availabilities) {
      const bookedTimes = new Set(avail.bookedSlots.map(s => s.scheduledTime));
      
      // Generar slots desde startTime hasta endTime
      const [startH, startM] = avail.startTime.split(':').map(Number);
      const [endH, endM] = avail.endTime.split(':').map(Number);
      
      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes + avail.slotDuration <= endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const mins = currentMinutes % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

        if (!bookedTimes.has(timeStr)) {
          allSlots.push({
            time: timeStr,
            availabilityId: avail.id,
          });
        }

        currentMinutes += avail.slotDuration;
      }
    }

    // Ordenar por hora
    allSlots.sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json({
      success: true,
      date: dateStr,
      gameChangerId: parseInt(gameChangerId),
      availableSlots: allSlots,
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/gc-calls/slots
 * Agendar un slot de llamada
 * Body: { availabilityId, date, time, squadId? }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { availabilityId, date, time, squadId } = body;

    if (!availabilityId || !date || !time) {
      return NextResponse.json({
        success: false,
        error: 'availabilityId, date y time son requeridos',
      }, { status: 400 });
    }

    // Verificar que la disponibilidad existe
    const availability = await prisma.gCAvailability.findUnique({
      where: { id: availabilityId },
      include: {
        gameChanger: { select: { nombre: true } },
      },
    });

    if (!availability || !availability.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Disponibilidad no válida',
      }, { status: 404 });
    }

    // Parsear la fecha correctamente para evitar problemas de timezone
    const [year, month, day] = date.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day);

    // Verificar que el slot no esté ya tomado para este GC en esta fecha/hora
    // Verificamos por gameChangerId para cubrir el caso de múltiples disponibilidades
    const existingSlot = await prisma.gCCallSlot.findFirst({
      where: {
        scheduledDate,
        scheduledTime: time,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        availability: {
          gameChangerId: availability.gameChangerId,
        },
      },
    });

    if (existingSlot) {
      return NextResponse.json({
        success: false,
        error: 'Este horario ya está reservado',
      }, { status: 409 });
    }

    // Verificar que el participante no tenga ya una cita en el mismo día con este GC
    const existingBooking = await prisma.gCCallSlot.findFirst({
      where: {
        participantId: user.id,
        scheduledDate,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        availability: {
          gameChangerId: availability.gameChangerId,
        },
      },
    });

    if (existingBooking) {
      return NextResponse.json({
        success: false,
        error: 'Ya tienes una cita agendada con este Game Changer para este día',
      }, { status: 409 });
    }

    // Calcular hora de fin
    const [hours, mins] = time.split(':').map(Number);
    const endMinutes = hours * 60 + mins + availability.slotDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Crear el slot
    const slot = await prisma.gCCallSlot.create({
      data: {
        availabilityId,
        participantId: user.id,
        squadId: squadId || availability.squadId,
        scheduledDate,
        scheduledTime: time,
        endTime,
        status: 'SCHEDULED',
      },
      include: {
        availability: {
          include: {
            gameChanger: { select: { nombre: true, telefono: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Llamada agendada exitosamente',
      booking: {
        id: slot.id,
        date: slot.scheduledDate,
        time: slot.scheduledTime,
        endTime: slot.endTime,
        gameChanger: slot.availability.gameChanger.nombre,
        status: slot.status,
      },
    });
  } catch (error) {
    console.error('Error booking slot:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/gc-calls/slots
 * Cancelar una cita
 * Query: slotId, reason?
 */
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    const reason = searchParams.get('reason') || 'Cancelado por usuario';

    if (!slotId) {
      return NextResponse.json({ success: false, error: 'slotId requerido' }, { status: 400 });
    }

    // Verificar que el slot pertenece al usuario o es el GC
    const slot = await prisma.gCCallSlot.findUnique({
      where: { id: slotId },
      include: {
        availability: { select: { gameChangerId: true } },
      },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Cita no encontrada' }, { status: 404 });
    }

    const isParticipant = slot.participantId === user.id;
    const isGC = slot.availability.gameChangerId === user.id;

    if (!isParticipant && !isGC) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Cancelar el slot
    await prisma.gCCallSlot.update({
      where: { id: slotId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: user.id,
        cancelReason: reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cita cancelada',
    });
  } catch (error) {
    console.error('Error cancelling slot:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
