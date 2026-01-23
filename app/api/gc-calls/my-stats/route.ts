import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gc-calls/my-stats
 * Estadísticas para el Game Changer sobre sus llamadas y miembros
 * Incluye estado de llamadas del día para cada participante
 */
export async function GET() {
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

    // Obtener todos los squads donde este GC es líder
    const squads = await prisma.smallGroup.findMany({
      where: {
        leaderId: user.id,
        isActive: true,
      },
      include: {
        members: {
          where: { isActive: true },
          select: { userId: true },
        },
        vision: {
          select: {
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
          },
        },
      },
    });

    // Calcular información del día de entrenamiento para cada squad
    // Básico: 3 días - Día 1 llegan, Días 2 y 3 llamada de staff
    // Avanzado: 4 días - Día 1 llegan, Días 2, 3 y 4 llamada de staff
    const squadTrainingInfo: Record<string, {
      currentDay: number | null;
      totalDays: number;
      isStaffCallDay: boolean;
      staffCallDays: number[];
      level: string;
    }> = {};

    squads.forEach(squad => {
      const vision = squad.vision;
      const level = squad.level || 'BASIC';
      const totalDays = level === 'ADVANCED' ? 4 : 3;
      const staffCallDays = level === 'ADVANCED' ? [2, 3, 4] : [2, 3];
      
      let currentDay: number | null = null;
      let isStaffCallDay = false;

      // Obtener fecha de inicio según el nivel
      let startDate: Date | null = null;
      if (level === 'ADVANCED' && vision?.advancedStartDate) {
        startDate = new Date(vision.advancedStartDate);
      } else if (vision?.startDate) {
        startDate = new Date(vision.startDate);
      }

      if (startDate) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        
        const diffTime = now.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        currentDay = diffDays + 1;
        
        if (currentDay >= 1 && currentDay <= totalDays) {
          isStaffCallDay = staffCallDays.includes(currentDay);
        }
      }

      // Determinar si el átomo debe mostrarse en el dashboard
      // Para BASIC: se muestra hasta que inicie el Avanzado (o 14 días después si no hay Avanzado)
      // Para ADVANCED: se muestra hasta 14 días después de que termine
      let showInDashboard = true;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (level === 'BASIC') {
        // Si hay fecha de inicio de Avanzado, mostrar hasta que inicie
        if (vision?.advancedStartDate) {
          const advStartDate = new Date(vision.advancedStartDate);
          advStartDate.setHours(0, 0, 0, 0);
          if (now >= advStartDate) {
            // El Avanzado ya inició - ocultar widget de Básico
            showInDashboard = false;
          }
        } else if (currentDay !== null && currentDay > totalDays + 14) {
          // No hay Avanzado programado - usar lógica de 14 días después
          showInDashboard = false;
        }
      } else {
        // ADVANCED: ocultar 14 días después de que termine
        if (currentDay !== null && currentDay > totalDays + 14) {
          showInDashboard = false;
        }
      }

      squadTrainingInfo[squad.id] = {
        currentDay,
        totalDays,
        isStaffCallDay,
        staffCallDays,
        level,
        showInDashboard,
      };
    });

    // Obtener IDs de todos los miembros
    const memberIds = squads.flatMap(s => s.members.map(m => m.userId));
    const totalMembers = memberIds.length;

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          totalMembers: 0,
          todayCalls: 0,
          membersWithoutCall: 0,
        },
        upcomingCalls: [],
        memberSchedules: {},
        todayCallStatus: {},
      });
    }

    // Fecha de hoy (inicio y fin del día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Obtener IDs de disponibilidades del GC
    const gcAvailabilities = await prisma.gCAvailability.findMany({
      where: {
        gameChangerId: user.id,
        isActive: true,
      },
      select: { id: true },
    });
    const availabilityIds = gcAvailabilities.map(a => a.id);

    // Llamadas de hoy (agendadas) a través de las disponibilidades del GC
    const todayCalls = await prisma.gCCallSlot.findMany({
      where: {
        availabilityId: { in: availabilityIds },
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: 'SCHEDULED',
      },
      include: {
        participant: {
          select: { id: true, nombre: true, imagen: true },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Buscar los horarios de TODOS los miembros (sus slots programados)
    const allMemberSlots = await prisma.gCCallSlot.findMany({
      where: {
        participantId: { in: memberIds },
      },
      select: { 
        participantId: true,
        scheduledTime: true,
      },
      orderBy: { bookedAt: 'desc' },
    });

    // Crear mapa de horarios: userId -> scheduledTime (el más reciente)
    const memberSchedules: Record<number, string> = {};
    const membersWithAnyCall = new Set<number>();
    
    allMemberSlots.forEach(slot => {
      membersWithAnyCall.add(slot.participantId);
      // Solo guardar el primero (más reciente por el orderBy)
      if (!memberSchedules[slot.participantId]) {
        memberSchedules[slot.participantId] = slot.scheduledTime;
      }
    });

    // Miembros sin llamada agendada
    const membersWithoutCall = memberIds.filter(id => !membersWithAnyCall.has(id)).length;

    // ========== NUEVO: Estado de llamadas del día ==========
    // Obtener todos los intentos de llamada de HOY para los miembros
    const todayAttempts = await (prisma as any).gCCallAttempt.findMany({
      where: {
        gameChangerId: user.id,
        participantId: { in: memberIds },
        attemptedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { attemptedAt: 'desc' },
    });

    // Crear mapa de estado por participante:
    // - 'completed': Al menos una llamada completada hoy
    // - 'pending_retry': Intentó pero no contestó (necesita reintento)
    // - null: Sin llamadas hoy
    const todayCallStatus: Record<number, { 
      status: 'completed' | 'pending_retry' | null;
      attempts: number;
      lastAttempt?: Date;
      rating?: number | null;
    }> = {};

    // Inicializar todos los miembros con estado null
    memberIds.forEach(id => {
      todayCallStatus[id] = { status: null, attempts: 0 };
    });

    // Procesar intentos del día
    todayAttempts.forEach((attempt: any) => {
      const currentStatus = todayCallStatus[attempt.participantId];
      
      // Incrementar contador de intentos
      if (!currentStatus.attempts || attempt.attemptNumber > currentStatus.attempts) {
        currentStatus.attempts = attempt.attemptNumber;
      }
      
      // Si ya está marcado como completed, no cambiar
      if (currentStatus.status === 'completed') return;
      
      if (attempt.completed) {
        // Llamada completada
        currentStatus.status = 'completed';
        currentStatus.lastAttempt = attempt.attemptedAt;
        currentStatus.rating = attempt.potentialRating;
      } else if (!currentStatus.status) {
        // Primer intento sin contestar
        currentStatus.status = 'pending_retry';
        currentStatus.lastAttempt = attempt.attemptedAt;
      }
    });

    // Contar llamadas completadas hoy
    const completedToday = Object.values(todayCallStatus).filter(s => s.status === 'completed').length;

    // Determinar el training info más relevante:
    // 1. Si hay un squad de ADVANCED que debe mostrarse, usar ese
    // 2. Si hay un squad de BASIC que debe mostrarse, usar ese
    // 3. Si BASIC ya no debe mostrarse pero no hay ADVANCED, indicar que necesita crear ADVANCED
    let activeTrainingInfo = null;
    let needsAdvancedSquad = false;
    
    // Buscar squad de ADVANCED activo
    const advancedSquad = squads.find(s => s.level === 'ADVANCED');
    const basicSquad = squads.find(s => s.level === 'BASIC');
    
    if (advancedSquad && squadTrainingInfo[advancedSquad.id]?.showInDashboard) {
      activeTrainingInfo = squadTrainingInfo[advancedSquad.id];
    } else if (basicSquad) {
      const basicInfo = squadTrainingInfo[basicSquad.id];
      if (basicInfo?.showInDashboard) {
        activeTrainingInfo = basicInfo;
      } else {
        // BÁSICO ya terminó/no debe mostrarse y no hay AVANZADO
        // Verificar si el Avanzado ya inició
        const vision = basicSquad.vision;
        if (vision?.advancedStartDate) {
          const advStartDate = new Date(vision.advancedStartDate);
          advStartDate.setHours(0, 0, 0, 0);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          if (now >= advStartDate) {
            // Verificar si el GC tiene asignación VisionGameChanger para esta visión
            const visionId = basicSquad.visionId;
            const gcAssignment = await prisma.visionGameChanger.findFirst({
              where: {
                gameChangerId: user.id,
                visionId: visionId,
              },
            });
            
            // Solo mostrar opción de crear squad ADVANCED si tiene asignación
            if (gcAssignment) {
              needsAdvancedSquad = true;
              // Calcular info del entrenamiento Avanzado aunque no tenga squad
              const totalDays = 4;
              const staffCallDays = [2, 3, 4];
              const diffTime = now.getTime() - advStartDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const currentDay = diffDays + 1;
              const isStaffCallDay = currentDay >= 1 && currentDay <= totalDays && staffCallDays.includes(currentDay);
              
              activeTrainingInfo = {
                currentDay,
                totalDays,
                isStaffCallDay,
                staffCallDays,
                level: 'ADVANCED',
                showInDashboard: true,
              };
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalMembers,
        todayCalls: todayCalls.length,
        membersWithoutCall,
        completedToday,
      },
      memberSchedules, // Mapa de userId -> horario
      todayCallStatus, // Mapa de userId -> estado de llamada del día
      // Información de entrenamiento por squad
      squadTrainingInfo,
      // Resumen del día de entrenamiento actual (del nivel activo)
      trainingInfo: activeTrainingInfo,
      // Indica si el GC necesita crear un squad de Avanzado
      needsAdvancedSquad,
    });
  } catch (error) {
    console.error('Error fetching GC stats:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
