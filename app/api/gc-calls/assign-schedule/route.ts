import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/gc-calls/assign-schedule
 * Game Changer asigna horario fijo a un participante
 * HORARIOS FIJOS: 7:00 AM - 9:30 AM (no requiere configuración previa)
 * 
 * NOTA: Se crea automáticamente un GCAvailability "de sistema" para mantener
 * la integridad del schema, pero NO es configurable por el GC.
 * El GCAvailability configurable se usará para llamadas Post-Entrenamiento.
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

    // Validar que el horario está dentro del rango fijo (7:00 - 9:30)
    const [hours, minutes] = normalizedTime.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startLimit = 7 * 60; // 7:00 AM
    const endLimit = 9 * 60 + 30; // 9:30 AM

    if (timeInMinutes < startLimit || timeInMinutes >= endLimit) {
      return NextResponse.json({ 
        success: false,
        error: 'El horario debe estar entre 7:00 AM y 9:30 AM' 
      }, { status: 400 });
    }

    console.log('📞 Asignando horario:', { participantId, time: normalizedTime, gcId });

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
        group: true
      }
    });

    if (!membership) {
      return NextResponse.json({ 
        error: 'El participante no pertenece a ninguno de tus átomos' 
      }, { status: 403 });
    }

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
      console.log('📅 GCAvailability de staff creado automáticamente para GC:', gcId);
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

    // Buscar si este participante ya tiene un slot asignado
    const existingParticipantSlot = await prisma.gCCallSlot.findFirst({
      where: {
        participantId: parseInt(participantId),
        squad: {
          leaderId: gcId,
        },
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calcular hora fin (agregar 10 minutos)
    const endMinutes = minutes + 10;
    const endHours = hours + Math.floor(endMinutes / 60);
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    let slot;
    if (existingParticipantSlot) {
      // Actualizar slot existente
      slot = await prisma.gCCallSlot.update({
        where: { id: existingParticipantSlot.id },
        data: {
          scheduledTime: normalizedTime,
          endTime: endTime,
          bookedAt: new Date(),
          assignedByGC: true,
        }
      });
    } else {
      // Crear nuevo slot
      slot = await prisma.gCCallSlot.create({
        data: {
          availabilityId: staffAvailability.id,
          participantId: parseInt(participantId),
          squadId: membership.groupId,
          scheduledDate: today,
          scheduledTime: normalizedTime,
          endTime: endTime,
          bookedAt: new Date(),
          assignedByGC: true,
        }
      });
    }

    return NextResponse.json({
      success: true,
      slot,
      message: 'Horario asignado correctamente'
    });

  } catch (error) {
    console.error('Error assigning schedule:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al asignar horario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
