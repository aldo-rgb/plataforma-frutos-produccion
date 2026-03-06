import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/gc-calls/available-times
 * Obtener todos los horarios disponibles para llamadas de staff
 * HORARIOS FIJOS: 4:00 AM - 10:00 PM (slots de 10 minutos)
 * Todos los GC tienen disponibilidad automática de Lunes a Domingo
 * No requiere configuración del GC
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let gameChangerId = searchParams.get('gameChangerId');

    // Si no viene gameChangerId, usar el usuario actual (para el GC viendo su propia agenda)
    let gcId: number;
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (gameChangerId) {
      gcId = parseInt(gameChangerId);
    } else if (currentUser) {
      // El GC está viendo sus propios horarios
      gcId = currentUser.id;
    } else {
      return NextResponse.json({ success: false, error: 'gameChangerId requerido' }, { status: 400 });
    }

    // ============================================
    // HORARIOS FIJOS PARA TODOS LOS GAME CHANGERS
    // 4:00 AM - 10:00 PM, slots de 10 minutos
    // Disponible Lunes a Domingo automáticamente
    // ============================================
    const STAFF_CALL_START_HOUR = 4;
    const STAFF_CALL_START_MIN = 0;
    const STAFF_CALL_END_HOUR = 22; // 10 PM
    const STAFF_CALL_END_MIN = 0;
    const SLOT_DURATION = 10; // minutos

    // Generar todos los horarios fijos
    const timesWithAvailability: { time: string; availabilityId: string }[] = [];
    
    let currentMinutes = STAFF_CALL_START_HOUR * 60 + STAFF_CALL_START_MIN;
    const endMinutes = STAFF_CALL_END_HOUR * 60 + STAFF_CALL_END_MIN;

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      timesWithAvailability.push({
        time: timeStr,
        availabilityId: 'fixed-staff-schedule', // ID fijo ya que no depende de configuración
      });
      
      currentMinutes += SLOT_DURATION;
    }

    // Obtener todos los horarios ya ocupados por participantes de este GC
    // Buscar a través del squad (ya que llamadas de staff no usan GCAvailability)
    const occupiedSlots = await prisma.gCCallSlot.findMany({
      where: {
        squad: {
          leaderId: gcId,
        },
      },
      select: {
        scheduledTime: true,
        participantId: true,
        participant: {
          select: { nombre: true },
        },
      },
    });

    // Crear map de horarios ocupados con nombre de participante
    const occupiedMap = new Map<string, { participantId: number; name: string }>();
    occupiedSlots.forEach(s => {
      occupiedMap.set(s.scheduledTime, {
        participantId: s.participantId,
        name: s.participant.nombre,
      });
    });

    // Marcar cada horario como disponible u ocupado
    const availableSlots = timesWithAvailability.map(slot => {
      const occupied = occupiedMap.get(slot.time);
      return {
        ...slot,
        isOccupied: !!occupied,
        participantId: occupied?.participantId,
        participantName: occupied?.name,
      };
    });

    return NextResponse.json({
      success: true,
      availableSlots,
      // También mantener formato anterior para compatibilidad
      availableTimes: availableSlots,
      // Información del horario fijo
      scheduleInfo: {
        startTime: '04:00',
        endTime: '22:00',
        slotDuration: SLOT_DURATION,
        totalSlots: timesWithAvailability.length,
        note: 'Disponibilidad automática Lunes a Domingo',
      },
    });
  } catch (error) {
    logger.error('Error fetching available times:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
