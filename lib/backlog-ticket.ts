import { prisma } from '@/lib/prisma';

// Tipos de situación que generan ticket de cortesía
export type TicketReasonType = 'BACKLOG' | 'DROP';
export type VisionLevel = 'BASIC' | 'ADVANCED' | 'PL';

interface SingleTicketResult {
  level: VisionLevel;
  success: boolean;
  ticketId?: string;
  visionName?: string;
  isPendingAssignment?: boolean;
  error?: string;
  alreadyUsedBacklog?: boolean;
}

interface BacklogTicketResult {
  success: boolean;
  ticketsCreated: SingleTicketResult[];
  totalTickets: number;
  levelsProcessed: VisionLevel[];
  error?: string;
}

/**
 * Genera tickets de cortesía para TODOS los niveles que el usuario tiene pagados.
 * 
 * LÓGICA:
 * 1. Busca todos los enrollments del usuario en la visión actual
 * 2. Para cada nivel (BASIC, ADVANCED, PL) que tenga ENROLLED, genera un ticket
 * 3. Cada nivel tiene su propia oportunidad de reposición (1 por nivel)
 * 
 * EJEMPLO:
 * - Usuario pagó trilogía (BASIC + ADVANCED + PL)
 * - Cae en DROP en BASIC
 * - Se le generan 3 tickets: uno para BASIC, uno para ADVANCED, uno para PL
 * 
 * @param userId - ID del usuario que fue marcado como BACKLOG o DROP
 * @param currentVisionId - ID de la visión actual del enrollment
 * @param organizationId - ID de la organización del usuario
 * @param reasonType - Tipo de razón: 'BACKLOG' o 'DROP'
 * @param triggerLevel - Nivel donde se disparó el BACKLOG/DROP (para filtrar si solo aplica a ese nivel)
 * @returns Resultado con los tickets creados
 */
export async function createBacklogTickets(
  userId: number,
  currentVisionId: number,
  organizationId: number,
  reasonType: TicketReasonType = 'BACKLOG',
  triggerLevel?: VisionLevel // Si se especifica, solo procesa ese nivel; si no, procesa todos los pagados
): Promise<BacklogTicketResult> {
  try {
    const now = new Date();
    const results: SingleTicketResult[] = [];

    // ========================================
    // 1. OBTENER TODOS LOS ENROLLMENTS DEL USUARIO EN ESTA VISIÓN
    // ========================================
    const userEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId: userId,
        visionId: currentVisionId,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      },
      select: {
        id: true,
        level: true,
        enrollmentStatus: true
      }
    });

    if (userEnrollments.length === 0) {
      return {
        success: false,
        ticketsCreated: [],
        totalTickets: 0,
        levelsProcessed: [],
        error: 'No se encontraron enrollments activos para este usuario'
      };
    }

    // Determinar qué niveles procesar
    let levelsToProcess: VisionLevel[];
    
    if (triggerLevel) {
      // Solo procesar el nivel específico donde se disparó el BACKLOG/DROP
      levelsToProcess = [triggerLevel];
    } else {
      // Procesar todos los niveles que tenga pagados
      levelsToProcess = userEnrollments.map(e => e.level as VisionLevel);
    }

    console.log(`🎫 Procesando tickets ${reasonType} para usuario ${userId}. Niveles: ${levelsToProcess.join(', ')}`);

    // ========================================
    // 2. BUSCAR PRÓXIMA VISIÓN
    // ========================================
    const nextVision = await prisma.vision.findFirst({
      where: {
        organizationId: organizationId,
        startDate: {
          gt: now
        },
        id: {
          not: currentVisionId
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        advancedStartDate: true,
        plWeekend1StartDate: true,
        organizationId: true
      }
    });

    // Si no hay próxima visión, usar la actual para ticket pendiente
    const currentVision = await prisma.vision.findUnique({
      where: { id: currentVisionId },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        advancedStartDate: true,
        plWeekend1StartDate: true,
        organizationId: true
      }
    });

    const targetVision = nextVision || currentVision;
    const isPendingAssignment = !nextVision;

    if (!targetVision) {
      return {
        success: false,
        ticketsCreated: [],
        totalTickets: 0,
        levelsProcessed: [],
        error: 'No se encontró visión para asignar tickets'
      };
    }

    // ========================================
    // 3. CREAR TICKET PARA CADA NIVEL
    // ========================================
    for (const level of levelsToProcess) {
      const result = await createSingleLevelTicket(
        userId,
        targetVision,
        organizationId,
        level,
        reasonType,
        isPendingAssignment,
        now
      );
      results.push(result);
    }

    // ========================================
    // 4. ENVIAR NOTIFICACIÓN CONSOLIDADA
    // ========================================
    const successfulTickets = results.filter(r => r.success);
    const failedAlreadyUsed = results.filter(r => r.alreadyUsedBacklog);

    if (successfulTickets.length > 0) {
      const reasonLabel = reasonType === 'DROP' ? 'DROP (baja)' : 'BACKLOG';
      const levelsCreated = successfulTickets.map(t => getLevelLabel(t.level)).join(', ');
      
      const message = isPendingAssignment
        ? `Se te han generado ${successfulTickets.length} ticket(s) de cortesía por tu situación de ${reasonLabel} para los niveles: ${levelsCreated}. Actualmente no hay un próximo entrenamiento programado, pero tus tickets están guardados. ⚠️ IMPORTANTE: Estos tickets NO son transferibles y solo tienes UNA oportunidad por nivel.`
        : `Se te han asignado ${successfulTickets.length} ticket(s) de cortesía para "${targetVision.nombre}" (niveles: ${levelsCreated}). ⚠️ IMPORTANTE: Estos tickets NO son transferibles y es tu ÚNICA oportunidad de reposición por nivel.`;

      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'OTHER',
          title: `🎫 ${successfulTickets.length} Ticket(s) de Reposición Generado(s)`,
          message: message,
          relatedId: currentVisionId
        }
      });

      // Notificación de advertencia
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '⚠️ Advertencia sobre tus Tickets',
          message: `Cada nivel tiene UNA sola oportunidad de reposición. Si vuelves a no asistir a alguno de estos niveles, NO se generará otro ticket para ese nivel. Asegúrate de confirmar tu asistencia con tu coordinador.`,
          relatedId: currentVisionId
        }
      });
    }

    // Notificar si ya había usado oportunidades
    if (failedAlreadyUsed.length > 0) {
      const levelsUsed = failedAlreadyUsed.map(t => getLevelLabel(t.level)).join(', ');
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '⚠️ Oportunidad(es) de Reposición Agotada(s)',
          message: `Ya utilizaste tu oportunidad de reposición para: ${levelsUsed}. No se generaron nuevos tickets para esos niveles.`,
          relatedId: currentVisionId
        }
      });
    }

    console.log(`✅ Proceso completado: ${successfulTickets.length} tickets creados, ${failedAlreadyUsed.length} ya usados`);

    return {
      success: successfulTickets.length > 0,
      ticketsCreated: results,
      totalTickets: successfulTickets.length,
      levelsProcessed: levelsToProcess
    };

  } catch (error: any) {
    console.error(`❌ Error creando tickets BACKLOG para usuario ${userId}:`, error);
    return {
      success: false,
      ticketsCreated: [],
      totalTickets: 0,
      levelsProcessed: [],
      error: error?.message || 'Error desconocido'
    };
  }
}

/**
 * Crea un ticket para un nivel específico
 */
async function createSingleLevelTicket(
  userId: number,
  targetVision: { id: number; nombre: string; startDate: Date | null; advancedStartDate: Date | null; plWeekend1StartDate: Date | null },
  organizationId: number,
  level: VisionLevel,
  reasonType: TicketReasonType,
  isPendingAssignment: boolean,
  now: Date
): Promise<SingleTicketResult> {
  try {
    // Verificar si ya usó su oportunidad para ESTE nivel específico
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        type: 'SCHOLARSHIP',
        level: level,
        amountPaid: 0 // Ticket de cortesía
      }
    });

    if (existingTicket) {
      console.log(`⚠️ Usuario ${userId} ya usó su oportunidad de reposición para ${level}`);
      return {
        level,
        success: false,
        alreadyUsedBacklog: true,
        error: `Ya utilizaste tu oportunidad de ticket de cortesía para ${level}`
      };
    }

    // Determinar fecha de validez según nivel
    let validUntil: Date;
    if (isPendingAssignment) {
      validUntil = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      switch (level) {
        case 'BASIC':
          validUntil = targetVision.startDate || new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          break;
        case 'ADVANCED':
          validUntil = targetVision.advancedStartDate || new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          break;
        case 'PL':
          validUntil = targetVision.plWeekend1StartDate || new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          break;
        default:
          validUntil = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      }
    }

    // Crear el ticket
    const newTicket = await prisma.ticket.create({
      data: {
        ownerId: userId,
        organizationId: organizationId,
        visionId: targetVision.id,
        level: level,
        type: 'SCHOLARSHIP',
        status: isPendingAssignment ? 'PENDING_PAYMENT' : 'ACTIVE',
        paymentStatus: 'GIFT',
        isTransferable: false,
        purchasePrice: 0,
        amountPaid: 0,
        validUntil: validUntil
      }
    });

    console.log(`✅ Ticket ${reasonType} ${level} creado: ${newTicket.id} para usuario ${userId}`);

    return {
      level,
      success: true,
      ticketId: newTicket.id,
      visionName: isPendingAssignment ? 'Pendiente de asignar' : targetVision.nombre,
      isPendingAssignment
    };

  } catch (error: any) {
    console.error(`❌ Error creando ticket ${level} para usuario ${userId}:`, error);
    return {
      level,
      success: false,
      error: error?.message || 'Error desconocido'
    };
  }
}

/**
 * Helper para obtener etiqueta legible del nivel
 */
function getLevelLabel(level: VisionLevel): string {
  switch (level) {
    case 'BASIC': return 'Básico';
    case 'ADVANCED': return 'Avanzado';
    case 'PL': return 'Liderato';
    default: return level;
  }
}

// ========================================
// FUNCIÓN LEGACY - Mantener compatibilidad
// ========================================
/**
 * @deprecated Usar createBacklogTickets en su lugar
 * Esta función se mantiene por compatibilidad pero ahora llama a la nueva
 */
export async function createBacklogTicket(
  userId: number,
  currentVisionId: number,
  organizationId: number,
  reasonType: TicketReasonType = 'BACKLOG'
): Promise<{
  success: boolean;
  ticketId?: string;
  visionName?: string;
  isPendingAssignment?: boolean;
  error?: string;
  alreadyUsedBacklog?: boolean;
}> {
  // Llamar a la nueva función pero solo para BASIC (comportamiento anterior)
  const result = await createBacklogTickets(userId, currentVisionId, organizationId, reasonType, 'BASIC');
  
  const basicResult = result.ticketsCreated.find(t => t.level === 'BASIC');
  
  if (basicResult) {
    return {
      success: basicResult.success,
      ticketId: basicResult.ticketId,
      visionName: basicResult.visionName,
      isPendingAssignment: basicResult.isPendingAssignment,
      error: basicResult.error,
      alreadyUsedBacklog: basicResult.alreadyUsedBacklog
    };
  }
  
  return {
    success: false,
    error: result.error || 'No se pudo crear el ticket'
  };
}

/**
 * Procesa DROP/BACKLOG para todos los niveles pagados del usuario
 * Esta es la función principal a usar cuando se marca DROP o BACKLOG
 */
export async function processBacklogForAllPaidLevels(
  userId: number,
  currentVisionId: number,
  organizationId: number,
  reasonType: TicketReasonType = 'BACKLOG'
): Promise<BacklogTicketResult> {
  // Esta función genera tickets para TODOS los niveles que tenga pagados
  return createBacklogTickets(userId, currentVisionId, organizationId, reasonType);
}
