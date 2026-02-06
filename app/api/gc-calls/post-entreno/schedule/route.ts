import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface CallData {
  dayOffset: number;
  date: string;
  time: string;
}

/**
 * POST /api/gc-calls/post-entreno/schedule
 * Agenda las 4 llamadas post-entrenamiento para un participante
 * Usa GCCallSlot existente y AdminTask para crear tareas visibles al participante
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gcId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { participantId, squadId, trainingEndDate, calls } = body;

    logger.debug('📅 Datos recibidos:', { 
      participantId, 
      squadId, 
      trainingEndDate,
      callsLength: calls?.length,
      calls
    });

    if (!participantId || !squadId || !trainingEndDate || !calls || calls.length === 0) {
      logger.debug('❌ Validación fallida:', {
        hasParticipantId: !!participantId,
        hasSquadId: !!squadId,
        hasTrainingEndDate: !!trainingEndDate,
        hasCalls: !!calls,
        callsLength: calls?.length
      });
      return NextResponse.json({ 
        success: false,
        error: 'Faltan datos requeridos',
        details: {
          participantId: !!participantId,
          squadId: !!squadId,
          trainingEndDate: !!trainingEndDate,
          calls: calls?.length || 0
        }
      }, { status: 400 });
    }

    logger.debug('📅 Agendando llamadas post-entreno:', { 
      participantId, 
      squadId, 
      gcId,
      callsCount: calls.length 
    });

    // Verificar que el squad pertenece al GC
    const squad = await prisma.smallGroup.findFirst({
      where: {
        id: squadId,
        leaderId: gcId,
        isActive: true
      },
      include: {
        vision: {
          select: { id: true, nombre: true, endDate: true }
        }
      }
    });

    if (!squad) {
      return NextResponse.json({ 
        success: false,
        error: 'El átomo no existe o no te pertenece' 
      }, { status: 403 });
    }

    // Verificar que el participante pertenece al squad y obtener su información
    const membership = await prisma.smallGroupMember.findFirst({
      where: {
        groupId: squadId,
        userId: parseInt(participantId),
        isActive: true
      },
      include: {
        user: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false,
        error: 'El participante no pertenece a este átomo' 
      }, { status: 403 });
    }

    const participantName = membership.user.nombre;

    // Obtener o crear GCAvailability para post-entreno
    let postEntrenoAvailability = await prisma.gCAvailability.findFirst({
      where: {
        gameChangerId: gcId,
        squadId: squadId,
      }
    });

    if (!postEntrenoAvailability) {
      postEntrenoAvailability = await prisma.gCAvailability.create({
        data: {
          gameChangerId: gcId,
          squadId: squadId,
          dayOfWeek: 0, // No importa para post-entreno
          startTime: '06:00',
          endTime: '09:00',
          slotDuration: 10, // Llamadas de 10 minutos
          isActive: true,
        }
      });
    }

    // Crear los slots de llamadas
    const createdSlots = [];
    const createdTasks = [];

    for (const call of calls as CallData[]) {
      const callDate = new Date(call.date);
      callDate.setHours(0, 0, 0, 0);
      
      // Calcular hora de fin (10 minutos después)
      const [hours, minutes] = call.time.split(':').map(Number);
      const endMinutes = minutes + 10;
      const endHours = hours + Math.floor(endMinutes / 60);
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

      // Crear el slot de llamada post-entrenamiento
      const slot = await prisma.gCCallSlot.create({
        data: {
          availabilityId: postEntrenoAvailability.id,
          participantId: parseInt(participantId),
          squadId: squadId,
          scheduledDate: callDate,
          scheduledTime: call.time,
          endTime: endTime,
          status: 'SCHEDULED',
          bookedAt: new Date(),
          assignedByGC: true,
          callType: 'POST_TRAINING',
        }
      });

      createdSlots.push(slot);

      // Crear AdminTask para el PARTICIPANTE (tipo EVENT para llamadas programadas)
      const participantTaskTitle = `📞 Llamada con tu Game Changer (Día ${call.dayOffset})`;
      const participantTaskDescription = `Llamada de seguimiento post-entrenamiento programada para las ${formatTime(call.time)}. Tu Game Changer te contactará para revisar tu progreso y apoyarte en tu transformación.`;

      const participantTask = await prisma.adminTask.create({
        data: {
          type: 'EVENT',
          titulo: participantTaskTitle,
          descripcion: participantTaskDescription,
          pointsReward: 50,
          targetType: 'USER',
          targetId: parseInt(participantId),
          fechaLimite: callDate,
          fechaEvento: callDate, // Fecha del evento para que aparezca en "HOY"
          horaEvento: call.time, // Hora del evento
          requiereEvidencia: false,
          isActive: true,
          createdBy: gcId,
          updatedAt: new Date(),
        }
      });

      // Crear TaskSubmission pendiente para el participante
      const participantSubmission = await prisma.taskSubmission.create({
        data: {
          adminTaskId: participantTask.id,
          usuarioId: parseInt(participantId),
          status: 'PENDING',
        }
      });

      // Crear AdminTask para el GAME CHANGER (tipo EVENT para llamadas programadas)
      const gcTaskTitle = `📞 Llamada con ${participantName} (Día ${call.dayOffset})`;
      const gcTaskDescription = `Llamada de seguimiento post-entrenamiento con tu participante ${participantName} programada para las ${formatTime(call.time)}. Revisa su progreso y brinda apoyo en su transformación.`;

      const gcTask = await prisma.adminTask.create({
        data: {
          type: 'EVENT',
          titulo: gcTaskTitle,
          descripcion: gcTaskDescription,
          pointsReward: 0, // El GC no recibe puntos por esto
          targetType: 'USER',
          targetId: gcId,
          fechaLimite: callDate,
          fechaEvento: callDate, // Fecha del evento para que aparezca en "HOY"
          horaEvento: call.time, // Hora del evento
          requiereEvidencia: false,
          isActive: true,
          createdBy: gcId,
          updatedAt: new Date(),
        }
      });

      // Crear TaskSubmission pendiente para el Game Changer
      const gcSubmission = await prisma.taskSubmission.create({
        data: {
          adminTaskId: gcTask.id,
          usuarioId: gcId,
          status: 'PENDING',
        }
      });

      createdTasks.push({ 
        participantTask, 
        participantSubmission,
        gcTask,
        gcSubmission
      });
    }

    logger.debug(`✅ Creadas ${createdSlots.length} llamadas y ${createdTasks.length} tareas para participante ${participantId} y GC ${gcId}`);

    return NextResponse.json({
      success: true,
      message: `Se agendaron ${createdSlots.length} llamadas post-entrenamiento`,
      slots: createdSlots,
      tasks: createdTasks.length
    });

  } catch (error) {
    logger.error('Error scheduling post-entreno calls:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al agendar llamadas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * GET /api/gc-calls/post-entreno/schedule
 * Obtiene el estado de las llamadas post-entreno para un squad
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gcId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const squadId = searchParams.get('squadId');

    logger.debug('📅 GET post-entreno schedule:', { gcId, squadId });

    if (!squadId) {
      return NextResponse.json({ 
        success: false,
        error: 'squadId es requerido' 
      }, { status: 400 });
    }

    // Buscar el squad sin filtrar por leaderId para debug
    const squad = await prisma.smallGroup.findFirst({
      where: {
        id: squadId,
      },
      include: {
        vision: {
          select: { 
            endDate: true,
            advancedEndDate: true
          }
        },
        members: {
          where: { isActive: true },
          select: { userId: true }
        }
      }
    });

    logger.debug('📅 Squad encontrado:', { 
      squadId: squad?.id, 
      leaderId: squad?.leaderId,
      gcId,
      level: squad?.level,
      visionEndDate: squad?.vision?.endDate,
      advancedEndDate: squad?.vision?.advancedEndDate
    });

    if (!squad) {
      return NextResponse.json({ 
        success: false,
        error: 'Átomo no encontrado' 
      }, { status: 404 });
    }
    
    // Determinar la fecha de fin correcta según el nivel
    let trainingEndDate = squad.vision?.endDate;
    if (squad.level === 'ADVANCED' && squad.vision?.advancedEndDate) {
      trainingEndDate = squad.vision.advancedEndDate;
    }

    // Obtener llamadas post-entreno programadas (identificadas por callType = POST_TRAINING)
    const scheduledCalls = await prisma.gCCallSlot.findMany({
      where: {
        squadId: squadId,
        callType: 'POST_TRAINING',
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED']
        }
      },
      include: {
        participant: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: [
        { participantId: 'asc' },
        { scheduledDate: 'asc' }
      ]
    });

    // Obtener SOLO los slots de POST_TRAINING ocupados del GC (no los del entrenamiento regular)
    // Las llamadas durante el entrenamiento NO deben bloquear horarios de post-entreno
    const allOccupiedSlots = await prisma.gCCallSlot.findMany({
      where: {
        availability: {
          gameChangerId: gcId
        },
        callType: 'POST_TRAINING', // Solo slots de post-entreno
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      },
      select: {
        scheduledDate: true,
        scheduledTime: true
      }
    });

    // Crear mapa de slots ocupados por fecha
    const occupiedSlotsByDate: Record<string, string[]> = {};
    for (const slot of allOccupiedSlots) {
      const dateKey = slot.scheduledDate.toISOString().split('T')[0];
      if (!occupiedSlotsByDate[dateKey]) {
        occupiedSlotsByDate[dateKey] = [];
      }
      occupiedSlotsByDate[dateKey].push(slot.scheduledTime);
    }

    // Agrupar por participante
    const participantCallsMap: Record<number, typeof scheduledCalls> = {};
    for (const call of scheduledCalls) {
      if (!participantCallsMap[call.participantId]) {
        participantCallsMap[call.participantId] = [];
      }
      participantCallsMap[call.participantId].push(call);
    }

    // Calcular estadísticas
    const memberIds = squad.members.map(m => m.userId);
    const scheduledParticipantIds = Object.keys(participantCallsMap).map(Number);
    const pendingParticipants = memberIds.filter(id => !scheduledParticipantIds.includes(id));

    return NextResponse.json({
      success: true,
      trainingEndDate: trainingEndDate,
      squadLevel: squad.level,
      totalMembers: memberIds.length,
      scheduledCount: scheduledParticipantIds.length,
      pendingCount: pendingParticipants.length,
      scheduledParticipants: scheduledParticipantIds,
      pendingParticipants,
      callsByParticipant: participantCallsMap,
      occupiedSlotsByDate // Agregar slots ocupados
    });

  } catch (error) {
    logger.error('Error getting post-entreno status:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener estado'
    }, { status: 500 });
  }
}

// Helper para formatear hora
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}
