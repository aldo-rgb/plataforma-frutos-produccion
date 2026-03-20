import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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

    // Obtener las asignaciones como GameChanger (para saber en qué niveles está registrado)
    const gcAssignments = await prisma.visionGameChanger.findMany({
      where: { gameChangerId: user.id },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            isActive: true,
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
            plWeekend1StartDate: true,
            plWeekend1EndDate: true,
          },
        },
      },
    });
    
    logger.debug('🔍 my-stats: GC Assignments found', {
      userId: user.id,
      userEmail: session.user.email,
      assignmentsCount: gcAssignments.length,
      assignments: gcAssignments.map(a => ({
        visionId: a.visionId,
        visionName: a.Vision?.nombre,
        visionIsActive: a.Vision?.isActive,
        level: a.level,
      })),
    });

    // Obtener todos los squads donde este GC es líder
    const squads = await prisma.smallGroup.findMany({
      where: {
        leaderId: user.id,
        isActive: true,
      },
      include: {
        SmallGroupMember: {
          where: { isActive: true },
          select: { userId: true },
        },
        Vision: {
          select: {
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
            plWeekend1StartDate: true,
            plWeekend1EndDate: true,
            plWeekend2StartDate: true,
            plWeekend2EndDate: true,
            plWeekend3StartDate: true,
            plWeekend3EndDate: true,
          },
        },
      },
    });

    // Calcular información del día de entrenamiento para cada squad
    // Básico: 3 días - Día 1 llegan, Días 2 y 3 llamada de staff
    // Avanzado: 4 días - Día 1 llegan, Días 2, 3 y 4 llamada de staff
    // PL: 3 fines de semana de 2 días cada uno = 6 días totales
    const squadTrainingInfo: Record<string, {
      currentDay: number | null;
      totalDays: number;
      isStaffCallDay: boolean;
      staffCallDays: number[];
      level: string;
      showInDashboard?: boolean;
      plWeekendInfo?: {
        currentWeekend: number | null;
        isWeekendActive: boolean;
        weekendDay: number | null;
      };
    }> = {};

    squads.forEach(squad => {
      const vision = squad.Vision;
      const level = squad.level || 'BASIC';
      
      // Configuración por nivel
      let totalDays: number;
      let staffCallDays: number[];
      
      if (level === 'PL') {
        totalDays = 6; // 3 fines de semana x 2 días
        staffCallDays = [1, 2, 3, 4, 5, 6]; // Todos los días de PL requieren seguimiento
      } else if (level === 'ADVANCED') {
        totalDays = 4;
        staffCallDays = [2, 3, 4];
      } else {
        totalDays = 3;
        staffCallDays = [2, 3];
      }
      
      let currentDay: number | null = null;
      let isStaffCallDay = false;
      let plWeekendInfo: { currentWeekend: number | null; isWeekendActive: boolean; weekendDay: number | null } | undefined;

      // Obtener fecha de inicio según el nivel
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      if (level === 'PL') {
        // Para PL, calcular en qué fin de semana estamos
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const weekends = [
          { start: vision?.plWeekend1StartDate, end: vision?.plWeekend1EndDate, num: 1 },
          { start: vision?.plWeekend2StartDate, end: vision?.plWeekend2EndDate, num: 2 },
          { start: vision?.plWeekend3StartDate, end: vision?.plWeekend3EndDate, num: 3 },
        ];
        
        let activeWeekend: { start: Date; end: Date; num: number } | null = null;
        let lastEndedWeekend: { start: Date; end: Date; num: number } | null = null;
        
        for (const w of weekends) {
          if (w.start && w.end) {
            const wStart = new Date(w.start);
            const wEnd = new Date(w.end);
            wStart.setHours(0, 0, 0, 0);
            wEnd.setHours(23, 59, 59, 999);
            
            if (now >= wStart && now <= wEnd) {
              activeWeekend = { start: wStart, end: wEnd, num: w.num };
              break;
            }
            
            if (now > wEnd) {
              lastEndedWeekend = { start: wStart, end: wEnd, num: w.num };
            }
          }
        }
        
        if (activeWeekend) {
          // Estamos en un fin de semana activo
          const diffTime = now.getTime() - activeWeekend.start.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const weekendDay = diffDays + 1; // 1 o 2
          currentDay = (activeWeekend.num - 1) * 2 + weekendDay; // 1-2, 3-4, 5-6
          isStaffCallDay = true; // Durante PL siempre hay seguimiento
          
          plWeekendInfo = {
            currentWeekend: activeWeekend.num,
            isWeekendActive: true,
            weekendDay,
          };
        } else if (lastEndedWeekend) {
          // No estamos en un fin de semana, pero ya terminó al menos uno
          currentDay = lastEndedWeekend.num * 2; // El último día del último fin de semana completado
          isStaffCallDay = false;
          
          plWeekendInfo = {
            currentWeekend: lastEndedWeekend.num,
            isWeekendActive: false,
            weekendDay: null,
          };
        } else {
          // Aún no ha iniciado ningún fin de semana de PL
          currentDay = 0;
          plWeekendInfo = {
            currentWeekend: null,
            isWeekendActive: false,
            weekendDay: null,
          };
        }
      } else if (level === 'ADVANCED' && vision?.advancedStartDate) {
        startDate = new Date(vision.advancedStartDate);
        endDate = vision?.advancedEndDate ? new Date(vision.advancedEndDate) : null;
      } else if (vision?.startDate) {
        startDate = new Date(vision.startDate);
        endDate = vision?.endDate ? new Date(vision.endDate) : null;
      }

      // Para BASIC y ADVANCED, calcular currentDay basado en startDate
      if (level !== 'PL' && startDate) {
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
      // Para PL: se muestra mientras los fines de semana estén activos o hasta 14 días después del último
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
      } else if (level === 'ADVANCED') {
        // ADVANCED: ocultar 14 días después de que termine
        if (currentDay !== null && currentDay > totalDays + 14) {
          showInDashboard = false;
        }
      } else if (level === 'PL') {
        // PL: mostrar mientras haya fines de semana pendientes o hasta 14 días después del último
        if (vision?.plWeekend3EndDate) {
          const plEnd = new Date(vision.plWeekend3EndDate);
          plEnd.setHours(0, 0, 0, 0);
          const diffTime = now.getTime() - plEnd.getTime();
          const daysSinceEnd = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (daysSinceEnd > 14) {
            showInDashboard = false;
          }
        }
      }

      squadTrainingInfo[squad.id] = {
        currentDay,
        totalDays,
        isStaffCallDay,
        staffCallDays,
        level,
        showInDashboard,
        plWeekendInfo,
      };
    });

    // Obtener IDs de todos los miembros
    const memberIds = squads.flatMap(s => s.SmallGroupMember.map(m => m.userId));
    const totalMembers = memberIds.length;

    // Si no hay miembros, aún necesitamos calcular trainingInfo basado en gcAssignments
    if (memberIds.length === 0) {
      // Calcular trainingInfo desde gcAssignments aunque no haya squads
      let trainingInfoForEmpty = null;
      let targetVisionIdForEmpty: number | null = null;
      
      if (gcAssignments.length > 0) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const gracePeriodDays = 7;
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);
        
        // Filtrar solo asignaciones con visiones activas (entrenamiento en curso o próximo)
        const activeAssignments = gcAssignments.filter(a => {
          const vision = a.Vision;
          if (!vision?.isActive) return false;
          
          let levelEndDate: Date | null = null;
          if (a.level === 'PL' && vision.plWeekend1EndDate) {
            // Para PL, considerar todo el período
            levelEndDate = new Date(vision.plWeekend1EndDate);
          } else if (a.level === 'ADVANCED' && vision.advancedEndDate) {
            levelEndDate = new Date(vision.advancedEndDate);
          } else if (vision.endDate) {
            levelEndDate = new Date(vision.endDate);
          }
          
          // Considerar activa si no ha terminado o está dentro del período de gracia
          return !levelEndDate || levelEndDate >= cutoffDate;
        });
        
        console.log('🔍 DEBUG my-stats: Active assignments filtered', {
          totalAssignments: gcAssignments.length,
          activeAssignments: activeAssignments.length,
          active: activeAssignments.map(a => ({ visionId: a.visionId, level: a.level })),
        });
        
        if (activeAssignments.length > 0) {
          // Ordenar por: 1) Nivel (PL > ADVANCED > BASIC), 2) Fecha de inicio más reciente
          const levelPriority = ['PL', 'ADVANCED', 'BASIC'];
          const sortedAssignments = [...activeAssignments].sort((a, b) => {
            const levelDiff = levelPriority.indexOf(a.level) - levelPriority.indexOf(b.level);
            if (levelDiff !== 0) return levelDiff;
            // Si mismo nivel, priorizar visión más reciente
            const dateA = a.Vision?.startDate ? new Date(a.Vision.startDate).getTime() : 0;
            const dateB = b.Vision?.startDate ? new Date(b.Vision.startDate).getTime() : 0;
            return dateB - dateA;
          });
          
          const highestLevelAssignment = sortedAssignments[0];
          const level = highestLevelAssignment.level;
          const vision = highestLevelAssignment.Vision;
          
          console.log('🔍 DEBUG my-stats (empty squads): Using active gcAssignment', {
            level,
            visionId: highestLevelAssignment.visionId,
            visionName: vision?.nombre,
          });
        
          // Determinar fechas según el nivel
          let totalDays = 3;
          let staffCallDays = [2, 3];
          let startDate: Date | null = null;
          
          if (level === 'PL' && vision?.plWeekend1StartDate) {
            startDate = new Date(vision.plWeekend1StartDate);
            totalDays = 6;
            staffCallDays = [1, 2, 3, 4, 5, 6];
          } else if (level === 'ADVANCED' && vision?.advancedStartDate) {
            startDate = new Date(vision.advancedStartDate);
            totalDays = 4;
            staffCallDays = [2, 3, 4];
          } else if (vision?.startDate) {
            startDate = new Date(vision.startDate);
            totalDays = 3;
            staffCallDays = [2, 3];
          }
          
          let currentDay: number | null = null;
          let isStaffCallDay = false;
          
          if (startDate) {
            const now2 = new Date();
            now2.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            
            const diffTime = now2.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            currentDay = diffDays + 1;
            
            if (currentDay >= 1 && currentDay <= totalDays) {
              isStaffCallDay = staffCallDays.includes(currentDay);
            }
          }
          
          trainingInfoForEmpty = {
            currentDay,
            totalDays,
            isStaffCallDay,
            staffCallDays,
            level,
            showInDashboard: true,
          };
          
          targetVisionIdForEmpty = highestLevelAssignment.visionId;
        }
      }
      
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
        trainingInfo: trainingInfoForEmpty,
        targetVisionId: targetVisionIdForEmpty,
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
        Usuario_GCCallSlot_participantIdToUsuario: {
          select: { id: true, nombre: true, imagen: true },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Buscar los horarios de TODOS los miembros (sus slots programados)
    // Separamos por tipo de llamada: TRAINING vs POST_TRAINING
    const allMemberSlots = await prisma.gCCallSlot.findMany({
      where: {
        participantId: { in: memberIds },
      },
      select: { 
        participantId: true,
        scheduledTime: true,
        callType: true,
      },
      orderBy: { bookedAt: 'desc' },
    });

    // Crear mapa de horarios: userId -> scheduledTime (el más reciente)
    // Ahora separamos por tipo de llamada
    const memberSchedules: Record<number, string> = {}; // Para compatibilidad
    const trainingSchedules: Record<number, string> = {}; // Llamadas durante entrenamiento
    const postEntrenoSchedules: Record<number, string> = {}; // Llamadas post-entreno
    const membersWithAnyCall = new Set<number>();
    
    allMemberSlots.forEach(slot => {
      membersWithAnyCall.add(slot.participantId);
      
      // Separar por tipo de llamada
      if (slot.callType === 'POST_TRAINING') {
        if (!postEntrenoSchedules[slot.participantId]) {
          postEntrenoSchedules[slot.participantId] = slot.scheduledTime;
        }
      } else if (slot.callType === 'TRAINING') {
        if (!trainingSchedules[slot.participantId]) {
          trainingSchedules[slot.participantId] = slot.scheduledTime;
        }
      }
      
      // Para compatibilidad, guardar el más reciente en memberSchedules general
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
    // 1. Si hay un squad de PL que debe mostrarse, usar ese
    // 2. Si hay un squad de ADVANCED que debe mostrarse, usar ese
    // 3. Si hay un squad de BASIC que debe mostrarse, usar ese
    // 4. Si no hay squads, usar las asignaciones de VisionGameChanger para determinar el nivel
    let activeTrainingInfo = null;
    let needsAdvancedSquad = false;
    let targetVisionId: number | null = null;
    
    // Buscar squads por nivel (prioridad: PL > ADVANCED > BASIC)
    const plSquad = squads.find(s => s.level === 'PL');
    const advancedSquad = squads.find(s => s.level === 'ADVANCED');
    const basicSquad = squads.find(s => s.level === 'BASIC');
    
    logger.debug('🔍 my-stats: Squad search results', {
      userId: user.id,
      totalSquads: squads.length,
      hasPL: !!plSquad,
      hasAdvanced: !!advancedSquad,
      hasBasic: !!basicSquad,
      gcAssignmentsCount: gcAssignments.length,
      gcAssignmentLevels: gcAssignments.map(a => a.level),
    });
    
    if (plSquad && squadTrainingInfo[plSquad.id]?.showInDashboard) {
      activeTrainingInfo = squadTrainingInfo[plSquad.id];
    } else if (advancedSquad && squadTrainingInfo[advancedSquad.id]?.showInDashboard) {
      activeTrainingInfo = squadTrainingInfo[advancedSquad.id];
    } else if (basicSquad) {
      const basicInfo = squadTrainingInfo[basicSquad.id];
      if (basicInfo?.showInDashboard) {
        activeTrainingInfo = basicInfo;
      } else {
        // BÁSICO ya terminó/no debe mostrarse y no hay AVANZADO
        // Verificar si el Avanzado ya inició
        const vision = basicSquad.Vision;
        if (vision?.advancedStartDate) {
          const advStartDate = new Date(vision.advancedStartDate);
          advStartDate.setHours(0, 0, 0, 0);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          if (now >= advStartDate) {
            // Verificar si el GC tiene asignación VisionGameChanger para ADVANCED en esta visión
            const visionId = basicSquad.visionId;
            const gcAdvancedAssignment = await prisma.visionGameChanger.findFirst({
              where: {
                gameChangerId: user.id,
                visionId: visionId,
                level: 'ADVANCED',
              },
            });
            
            // Solo mostrar opción de crear squad ADVANCED si tiene asignación para ese nivel
            if (gcAdvancedAssignment) {
              needsAdvancedSquad = true;
              targetVisionId = visionId; // Guardar visionId para crear el squad
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

    // Si no hay activeTrainingInfo pero hay asignaciones de VisionGameChanger,
    // usar el nivel más alto asignado ACTIVO para indicar al frontend qué nivel usar
    console.log('🔍 DEBUG my-stats: Checking fallback condition', {
      hasActiveTrainingInfo: !!activeTrainingInfo,
      gcAssignmentsLength: gcAssignments.length,
      gcAssignments: gcAssignments.map(a => ({ visionId: a.visionId, level: a.level })),
    });
    
    if (!activeTrainingInfo && gcAssignments.length > 0) {
      const nowFallback = new Date();
      nowFallback.setHours(0, 0, 0, 0);
      const gracePeriodDays = 7;
      const cutoffDateFallback = new Date(nowFallback);
      cutoffDateFallback.setDate(cutoffDateFallback.getDate() - gracePeriodDays);
      
      // Filtrar solo asignaciones con visiones activas
      const activeAssignmentsFallback = gcAssignments.filter(a => {
        const vision = a.Vision;
        if (!vision?.isActive) return false;
        
        let levelEndDate: Date | null = null;
        if (a.level === 'PL' && vision.plWeekend1EndDate) {
          levelEndDate = new Date(vision.plWeekend1EndDate);
        } else if (a.level === 'ADVANCED' && vision.advancedEndDate) {
          levelEndDate = new Date(vision.advancedEndDate);
        } else if (vision.endDate) {
          levelEndDate = new Date(vision.endDate);
        }
        
        return !levelEndDate || levelEndDate >= cutoffDateFallback;
      });
      
      if (activeAssignmentsFallback.length > 0) {
        // Prioridad: PL > ADVANCED > BASIC, luego por fecha más reciente
        const levelPriority = ['PL', 'ADVANCED', 'BASIC'];
        const sortedAssignments = [...activeAssignmentsFallback].sort((a, b) => {
          const levelDiff = levelPriority.indexOf(a.level) - levelPriority.indexOf(b.level);
          if (levelDiff !== 0) return levelDiff;
          const dateA = a.Vision?.startDate ? new Date(a.Vision.startDate).getTime() : 0;
          const dateB = b.Vision?.startDate ? new Date(b.Vision.startDate).getTime() : 0;
          return dateB - dateA;
        });
        
        console.log('🔍 DEBUG my-stats: Using active gcAssignment fallback', {
          sortedAssignments: sortedAssignments.map(a => ({ visionId: a.visionId, level: a.level, visionName: a.Vision?.nombre })),
        });
        
        const highestLevelAssignment = sortedAssignments[0];
        const level = highestLevelAssignment.level;
        const vision = highestLevelAssignment.Vision;
        
        logger.debug('🔍 my-stats: Using gcAssignment fallback', {
          userId: user.id,
          assignmentLevel: level,
          visionId: highestLevelAssignment.visionId,
          advancedStartDate: vision?.advancedStartDate,
        });
        
        // Si es ADVANCED y no tiene squad, indicar que necesita crearlo
        if (level === 'ADVANCED') {
          needsAdvancedSquad = true;
          targetVisionId = highestLevelAssignment.visionId;
        }
        
        // Determinar fechas según el nivel
        let totalDays = 3;
        let staffCallDays = [2, 3];
        let startDate: Date | null = null;
        
        if (level === 'PL' && vision?.plWeekend1StartDate) {
          startDate = new Date(vision.plWeekend1StartDate);
          totalDays = 3; // PL tiene 3 fines de semana, pero simplificamos
          staffCallDays = [2, 3];
        } else if (level === 'ADVANCED' && vision?.advancedStartDate) {
          startDate = new Date(vision.advancedStartDate);
          totalDays = 4;
          staffCallDays = [2, 3, 4];
        } else if (vision?.startDate) {
          startDate = new Date(vision.startDate);
          totalDays = 3;
          staffCallDays = [2, 3];
        }
        
        let currentDay: number | null = null;
        let isStaffCallDay = false;
        
        if (startDate) {
          startDate.setHours(0, 0, 0, 0);
          
          const diffTime = nowFallback.getTime() - startDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          currentDay = diffDays + 1;
          
          if (currentDay >= 1 && currentDay <= totalDays) {
            isStaffCallDay = staffCallDays.includes(currentDay);
          }
        }
        
        activeTrainingInfo = {
          currentDay,
          totalDays,
          isStaffCallDay,
          staffCallDays,
          level,
          showInDashboard: true,
        };
        
        targetVisionId = highestLevelAssignment.visionId;
      }
    }
    
    logger.debug('🔍 my-stats: Final response', {
      userId: user.id,
      trainingInfoLevel: activeTrainingInfo?.level,
      targetVisionId,
      needsAdvancedSquad,
      squadsCount: squads.length,
      activeTrainingInfo,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalMembers,
        todayCalls: todayCalls.length,
        membersWithoutCall,
        completedToday,
      },
      memberSchedules, // Mapa de userId -> horario (compatibilidad)
      trainingSchedules, // Mapa de userId -> horario de llamadas TRAINING
      postEntrenoSchedules, // Mapa de userId -> horario de llamadas POST_TRAINING
      todayCallStatus, // Mapa de userId -> estado de llamada del día
      // Información de entrenamiento por squad
      squadTrainingInfo,
      // Resumen del día de entrenamiento actual (del nivel activo)
      trainingInfo: activeTrainingInfo,
      // Indica si el GC necesita crear un squad de Avanzado
      needsAdvancedSquad,
      // VisionId objetivo para crear el nuevo squad
      targetVisionId,
    });
  } catch (error) {
    logger.error('Error fetching GC stats:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
