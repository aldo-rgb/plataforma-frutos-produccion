import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper para calcular hora de fin
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

/**
 * GET /api/gc-calls/my-schedule
 * Obtener el horario programado del participante
 */
export async function GET(request: Request) {
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

    // Buscar si el participante ya tiene un horario guardado
    // Usamos GCCallSlot como registro de su preferencia de horario
    const existingSlot = await prisma.gCCallSlot.findFirst({
      where: {
        participantId: user.id,
      },
      select: {
        id: true,
        scheduledTime: true,
        availabilityId: true,
      },
      orderBy: {
        bookedAt: 'desc',
      },
    });

    if (existingSlot) {
      return NextResponse.json({
        success: true,
        hasSchedule: true,
        scheduledTime: existingSlot.scheduledTime,
        slotId: existingSlot.id,
        availabilityId: existingSlot.availabilityId,
      });
    }

    return NextResponse.json({
      success: true,
      hasSchedule: false,
    });
  } catch (error) {
    console.error('Error getting schedule:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/gc-calls/my-schedule
 * Guardar el horario de llamada del participante
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { time, gameChangerId, availabilityId } = body;

    if (!time || !gameChangerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'time y gameChangerId son requeridos' 
      }, { status: 400 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si ya tiene un slot previo, eliminarlo
    await prisma.gCCallSlot.deleteMany({
      where: {
        participantId: user.id,
      },
    });

    // Buscar la disponibilidad si no se proporcionó
    let finalAvailabilityId = availabilityId;
    if (!finalAvailabilityId) {
      const availability = await prisma.gCAvailability.findFirst({
        where: {
          gameChangerId: parseInt(gameChangerId),
          isActive: true,
        },
        select: { id: true },
      });
      finalAvailabilityId = availability?.id;
    }

    if (!finalAvailabilityId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se encontró disponibilidad del Game Changer' 
      }, { status: 400 });
    }

    // Obtener el squad del participante para asociar el slot
    const membership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: { groupId: true },
    });

    // Crear el nuevo slot con el horario seleccionado
    const slot = await prisma.gCCallSlot.create({
      data: {
        availabilityId: finalAvailabilityId,
        participantId: user.id,
        squadId: membership?.groupId || null,
        scheduledDate: new Date(), // Fecha de registro
        scheduledTime: time,
        endTime: calculateEndTime(time, 10), // 10 min de duración por defecto
        status: 'SCHEDULED',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Horario guardado exitosamente',
      slot: {
        id: slot.id,
        time: slot.scheduledTime,
      },
    });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
