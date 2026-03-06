import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/gc-calls/assign-schedule
 * Game Changer asigna horario fijo a un participante
 * HORARIOS FIJOS: 4:00 AM - 10:00 PM (disponibilidad automática para todos los GC)
 * 
 * NOTA: Se crea automáticamente un GCAvailability "de sistema" para mantener
 * la integridad del schema, pero NO es configurable por el GC.
 * 
 * FECHAS DE LLAMADAS:
 * - BÁSICO: 3 días de entrenamiento. Día 1 llegada, Días 2-3 llamadas staff (2 slots)
 * - AVANZADO: 4 días de entrenamiento. Día 1 llegada, Días 2-4 llamadas staff (3 slots)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gcId = parseInt(session.user.id);
    const body = await request.json();
    const { participantId, time } = body;

    if (!participantId || !time) {
      return NextResponse.json({ 
        success: false,
        error: 'participantId y time son requeridos' 
      }, { status: 400 });
    }

    // Normalizar el formato del tiempo a HH:mm
    const normalizedTime = time.includes(':') 
      ? time.split(':').map((p: string) => p.padStart(2, '0')).join(':')
      : time;

    // Validar que el horario está dentro del rango permitido (4:00 AM - 10:00 PM)
    const [hours, minutes] = normalizedTime.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startLimit = 4 * 60; // 4:00 AM
    const endLimit = 22 * 60; // 10:00 PM

    if (timeInMinutes < startLimit || timeInMinutes >= endLimit) {
      return NextResponse.json({ 
        success: false,
        error: 'El horario debe estar entre 4:00 AM y 10:00 PM' 
      }, { status: 400 });
    }

    logger.debug('📞 Asignando horario:', { participantId, time: normalizedTime, gcId });

    // Verificar que el participante pertenece a un squad del GC
    const membership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: parseInt(participantId),
        isActive: true,
        group: {
          leaderId: gcId,
          isActive: true,
        }
      },
      include: {
        group: {
          include: {
            vision: true
          }
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ 
        error: 'El participante no pertenece a ninguno de tus átomos' 
      }, { status: 403 });
    }

    const squad = membership.group;
    const vision = squad.vision;
    const level = squad.level; // BASIC o ADVANCED

    // Determinar la fecha de inicio según el nivel
    let trainingStartDate: Date | null = null;
    let numCallDays = 0;

    if (level === 'BASIC') {
      trainingStartDate = vision.startDate;
      numCallDays = 2; // Días 2 y 3 del entrenamiento
    } else if (level === 'ADVANCED') {
      trainingStartDate = vision.advancedStartDate;
      numCallDays = 3; // Días 2, 3 y 4 del entrenamiento
    } else {
      // Para PL u otros niveles, usar la fecha actual como fallback
      trainingStartDate = new Date();
      numCallDays = 1;
    }

    if (!trainingStartDate) {
      return NextResponse.json({ 
        error: `No hay fecha de inicio configurada para el nivel ${level}` 
      }, { status: 400 });
    }

    logger.debug('📅 Configuración de entrenamiento:', { 
      level, 
      trainingStartDate: trainingStartDate.toISOString(), 
      numCallDays 
    });

    // Obtener o crear un GCAvailability "de sistema" para llamadas de staff
    // Este availability es automático y representa el horario fijo 7:00-9:30
    // NO es el mismo que el configurable para Post-Entrenamiento
    let staffAvailability = await prisma.gCAvailability.findFirst({
      where: {
        gameChangerId: gcId,
        startTime: '07:00',
        endTime: '09:30',
        // Podemos identificarlo por el horario exacto del staff
      }
    });

    if (!staffAvailability) {
      // Crear automáticamente el availability de sistema para staff
      staffAvailability = await prisma.gCAvailability.create({
        data: {
          gameChangerId: gcId,
          dayOfWeek: 0, // Todos los días (no importa para staff)
          startTime: '07:00',
          endTime: '09:30',
          slotDuration: 10,
          isActive: true,
        }
      });
      logger.debug('📅 GCAvailability de staff creado automáticamente para GC:', gcId);
    }

    // Verificar que el horario está disponible (no ocupado por otro participante)
    const existingSlot = await prisma.gCCallSlot.findFirst({
      where: {
        squad: {
          leaderId: gcId,
        },
        scheduledTime: normalizedTime,
        participantId: {
          not: parseInt(participantId)
        }
      }
    });

    if (existingSlot) {
      return NextResponse.json({ 
        success: false,
        error: 'Este horario ya está ocupado por otro participante' 
      }, { status: 409 });
    }

    // Eliminar slots existentes del participante para este squad/nivel
    await prisma.gCCallSlot.deleteMany({
      where: {
        participantId: parseInt(participantId),
        squadId: membership.groupId,
      }
    });
    
    // Calcular hora fin (agregar 10 minutos)
    const endMinutes = minutes + 10;
    const endHours = hours + Math.floor(endMinutes / 60);
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Calcular las fechas de los días de llamada (Días 2, 3, 4 del entrenamiento)
    // Día 1 = fecha de inicio (llegada), Día 2 = inicio + 1, etc.
    const callDates: Date[] = [];
    for (let dayOffset = 1; dayOffset <= numCallDays; dayOffset++) {
      const callDate = new Date(trainingStartDate);
      callDate.setDate(callDate.getDate() + dayOffset);
      callDate.setHours(0, 0, 0, 0);
      callDates.push(callDate);
    }

    logger.debug('📅 Fechas de llamadas a crear:', callDates.map(d => d.toISOString()));

    // Crear un slot para cada día de llamadas
    const createdSlots = [];
    for (const callDate of callDates) {
      const slot = await prisma.gCCallSlot.create({
        data: {
          availabilityId: staffAvailability.id,
          participantId: parseInt(participantId),
          squadId: membership.groupId,
          scheduledDate: callDate,
          scheduledTime: normalizedTime,
          endTime: endTime,
          bookedAt: new Date(),
          assignedByGC: true,
          callType: 'TRAINING',
        }
      });
      createdSlots.push(slot);
      logger.debug(`✅ Slot creado para ${callDate.toISOString().split('T')[0]} a las ${normalizedTime}`);
    }

    return NextResponse.json({
      success: true,
      slots: createdSlots,
      message: `${createdSlots.length} horarios asignados correctamente para los días de entrenamiento`,
      dates: callDates.map(d => d.toISOString().split('T')[0])
    });

  } catch (error) {
    logger.error('Error assigning schedule:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al asignar horario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
