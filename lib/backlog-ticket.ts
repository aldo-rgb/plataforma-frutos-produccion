import { prisma } from '@/lib/prisma';

// Tipos de situación que generan ticket de cortesía
export type TicketReasonType = 'BACKLOG' | 'DROP';
export type VisionLevel = 'BASIC' | 'ADVANCED' | 'PL';

// Orden jerárquico de los niveles (BASIC < ADVANCED < PL)
const LEVEL_ORDER: VisionLevel[] = ['BASIC', 'ADVANCED', 'PL'];

interface SingleTicketResult {
  level: VisionLevel;
  success: boolean;
  ticketId?: string;
  visionName?: string;
  isPendingAssignment?: boolean;
  error?: string;
  alreadyUsedBacklog?: boolean;
  wasCancelled?: boolean;
  cancelledTicketId?: string;
}

interface BacklogTicketResult {
  success: boolean;
  ticketsCreated: SingleTicketResult[];
  ticketsCancelled: { level: VisionLevel; ticketId: string }[];
  totalTickets: number;
  levelsProcessed: VisionLevel[];
  error?: string;
}

/**
 * LÓGICA DE TICKETS BACKLOG/DROP CON CASCADA DE NIVELES
 * 
 * Los niveles son secuenciales: BASIC → ADVANCED → PL
 * Para llegar a un nivel superior, DEBES completar el anterior.
 * 
 * ESCENARIOS:
 * 
 * 1. DROP/BACKLOG en BÁSICO (teniendo trilogía pagada):
 *    - Genera ticket BASIC para siguiente visión
 *    - Genera ticket ADVANCED para siguiente visión
 *    - Genera ticket PL para siguiente visión
 *    → El usuario tendrá que repetir toda la trilogía en la siguiente visión
 * 
 * 2. DROP/BACKLOG en AVANZADO (ya pasó básico, tenía PL pagado):
 *    - Genera ticket ADVANCED para siguiente visión
 *    - CANCELA el ticket/enrollment de PL de la visión actual
 *    - RE-CREA ticket PL para la siguiente visión
 *    → El usuario hará ADVANCED + PL en la siguiente visión
 * 
 * 3. DROP/BACKLOG en LIDERATO (ya pasó básico y avanzado):
 *    - Solo genera ticket PL para siguiente visión
 *    → El usuario solo repetirá PL
 * 
 * REGLA IMPORTANTE:
 * - Cada nivel tiene UNA sola oportunidad de reposición
 * - Si ya usaste tu oportunidad de BASIC, no recibes otro ticket de BASIC
 */
export async function processBacklogForAllPaidLevels(
  userId: number,
  currentVisionId: number,
  organizationId: number,
  reasonType: TicketReasonType = 'BACKLOG',
  triggerLevel: VisionLevel = 'BASIC'
): Promise<BacklogTicketResult> {
  try {
    const now = new Date();
    const results: SingleTicketResult[] = [];
    const cancelledTickets: { level: VisionLevel; ticketId: string }[] = [];

    console.log(`🎫 Procesando ${reasonType} para usuario ${userId} desde nivel ${triggerLevel}`);

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
        enrollmentStatus: true,
        attendanceStatus: true
      }
    });

    if (userEnrollments.length === 0) {
      return {
        success: false,
        ticketsCreated: [],
        ticketsCancelled: [],
        totalTickets: 0,
        levelsProcessed: [],
        error: 'No se encontraron enrollments activos para este usuario'
      };
    }

    // Niveles que tiene pagados el usuario
    const paidLevels = userEnrollments.map(e => e.level as VisionLevel);
    
    // Determinar el índice del nivel donde cayó
    const triggerIndex = LEVEL_ORDER.indexOf(triggerLevel);
    
    // Niveles a procesar: desde el nivel donde cayó hasta el más alto que tenga pagado
    const levelsToProcess = LEVEL_ORDER.filter((level, index) => 
      index >= triggerIndex && paidLevels.includes(level)
    );

    console.log(`📋 Niveles pagados: ${paidLevels.join(', ')}`);
    console.log(`📋 Niveles a procesar (desde ${triggerLevel}): ${levelsToProcess.join(', ')}`);

    // ========================================
    // 2. BUSCAR PRÓXIMA VISIÓN
    // ========================================
    const nextVision = await prisma.vision.findFirst({
      where: {
        organizationId: organizationId,
        startDate: { gt: now },
        id: { not: currentVisionId }
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        advancedStartDate: true,
        plWeekend1StartDate: true,
        organizationId: true
      }
    });

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
        ticketsCancelled: [],
        totalTickets: 0,
        levelsProcessed: [],
        error: 'No se encontró visión para asignar tickets'
      };
    }

    // ========================================
    // 3. CANCELAR TICKETS DE NIVELES SUPERIORES (si aplica)
    // ========================================
    for (const level of levelsToProcess) {
      if (LEVEL_ORDER.indexOf(level) > triggerIndex) {
        // Buscar ticket activo de este nivel para esta visión
        const existingTicket = await prisma.ticket.findFirst({
          where: {
            ownerId: userId,
            visionId: currentVisionId,
            level: level,
            status: 'ACTIVE'
          }
        });

        if (existingTicket) {
          await prisma.ticket.update({
            where: { id: existingTicket.id },
            data: { status: 'CANCELLED' }
          });
          
          cancelledTickets.push({ level, ticketId: existingTicket.id });
          console.log(`🚫 Ticket ${level} cancelado: ${existingTicket.id}`);
        }

        // Marcar enrollment de niveles superiores
        const enrollmentToUpdate = userEnrollments.find(e => e.level === level);
        if (enrollmentToUpdate && enrollmentToUpdate.attendanceStatus !== 'ATTENDED') {
          await prisma.vision_enrollments.update({
            where: { id: enrollmentToUpdate.id },
            data: { 
              attendanceStatus: 'MOVED',
              enrollmentStatus: 'MOVED_TO_NEXT'
            }
          });
          console.log(`📦 Enrollment ${level} marcado como MOVED`);
        }
      }
    }

    // ========================================
    // 4. CREAR TICKETS PARA CADA NIVEL
    // ========================================
    for (const level of levelsToProcess) {
      const isCascaded = LEVEL_ORDER.indexOf(level) > triggerIndex;
      
      const result = await createSingleLevelTicket(
        userId,
        targetVision,
        organizationId,
        level,
        reasonType,
        isPendingAssignment,
        now,
        isCascaded
      );
      
      const cancelled = cancelledTickets.find(c => c.level === level);
      if (cancelled) {
        result.wasCancelled = true;
        result.cancelledTicketId = cancelled.ticketId;
      }
      
      results.push(result);
    }

    // ========================================
    // 5. ENVIAR NOTIFICACIONES
    // ========================================
    const successfulTickets = results.filter(r => r.success);
    const failedAlreadyUsed = results.filter(r => r.alreadyUsedBacklog);

    if (successfulTickets.length > 0) {
      const reasonLabel = reasonType === 'DROP' ? 'DROP (baja)' : 'BACKLOG';
      const levelsCreated = successfulTickets.map(t => getLevelLabel(t.level)).join(', ');
      
      let message = '';
      
      if (cancelledTickets.length > 0) {
        const levelsCancelled = cancelledTickets.map(c => getLevelLabel(c.level)).join(', ');
        message = `Por tu situación de ${reasonLabel} en ${getLevelLabel(triggerLevel)}, se han reorganizado tus tickets:\n\n` +
          `✅ Tickets generados para siguiente visión: ${levelsCreated}\n` +
          `🔄 Tickets movidos de visión actual: ${levelsCancelled}\n\n` +
          `Deberás completar estos niveles en la próxima visión.`;
      } else {
        message = isPendingAssignment
          ? `Se te han generado ${successfulTickets.length} ticket(s) de cortesía por ${reasonLabel} para: ${levelsCreated}. No hay próximo entrenamiento programado aún. ⚠️ Solo tienes UNA oportunidad de reposición por nivel.`
          : `Se te han asignado ${successfulTickets.length} ticket(s) para "${targetVision.nombre}" (${levelsCreated}). ⚠️ Esta es tu ÚNICA oportunidad de reposición por nivel.`;
      }

      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'OTHER',
          title: `🎫 Tickets de Reposición - ${reasonLabel}`,
          message: message,
          relatedId: currentVisionId
        }
      });
    }

    if (failedAlreadyUsed.length > 0) {
      const levelsUsed = failedAlreadyUsed.map(t => getLevelLabel(t.level)).join(', ');
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '⚠️ Oportunidades Agotadas',
          message: `Ya usaste tu oportunidad de reposición para: ${levelsUsed}. Contacta a tu coordinador.`,
          relatedId: currentVisionId
        }
      });
    }

    console.log(`✅ Completado: ${successfulTickets.length} creados, ${cancelledTickets.length} cancelados`);

    return {
      success: successfulTickets.length > 0,
      ticketsCreated: results,
      ticketsCancelled: cancelledTickets,
      totalTickets: successfulTickets.length,
      levelsProcessed: levelsToProcess
    };

  } catch (error: any) {
    console.error(`❌ Error procesando BACKLOG para usuario ${userId}:`, error);
    return {
      success: false,
      ticketsCreated: [],
      ticketsCancelled: [],
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
  now: Date,
  isCascaded: boolean = false
): Promise<SingleTicketResult> {
  try {
    // Solo verificamos oportunidad usada para el nivel trigger, no para cascaded
    if (!isCascaded) {
      const existingBacklogTicket = await prisma.ticket.findFirst({
        where: {
          ownerId: userId,
          type: 'SCHOLARSHIP',
          level: level,
          amountPaid: 0,
          paymentStatus: 'GIFT'
        }
      });

      if (existingBacklogTicket) {
        console.log(`⚠️ Usuario ${userId} ya usó oportunidad para ${level}`);
        return {
          level,
          success: false,
          alreadyUsedBacklog: true,
          error: `Ya utilizaste tu oportunidad para ${level}`
        };
      }
    }

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

    // Los tickets cascaded (movidos) también son GIFT porque ya estaban pagados
    const paymentStatus = 'GIFT';
    
    const newTicket = await prisma.ticket.create({
      data: {
        ownerId: userId,
        organizationId: organizationId,
        visionId: targetVision.id,
        level: level,
        type: 'SCHOLARSHIP',
        status: isPendingAssignment ? 'PENDING_PAYMENT' : 'ACTIVE',
        paymentStatus: paymentStatus,
        isTransferable: false,
        purchasePrice: 0,
        amountPaid: 0,
        validUntil: validUntil
      }
    });

    console.log(`✅ Ticket ${level} creado: ${newTicket.id} (${isCascaded ? 'MOVIDO' : 'REPOSICIÓN'})`);

    return {
      level,
      success: true,
      ticketId: newTicket.id,
      visionName: isPendingAssignment ? 'Pendiente' : targetVision.nombre,
      isPendingAssignment
    };

  } catch (error: any) {
    console.error(`❌ Error creando ticket ${level}:`, error);
    return {
      level,
      success: false,
      error: error?.message || 'Error desconocido'
    };
  }
}

function getLevelLabel(level: VisionLevel): string {
  switch (level) {
    case 'BASIC': return 'Básico';
    case 'ADVANCED': return 'Avanzado';
    case 'PL': return 'Liderato';
    default: return level;
  }
}

// ========================================
// FUNCIONES LEGACY
// ========================================

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
  const result = await processBacklogForAllPaidLevels(userId, currentVisionId, organizationId, reasonType, 'BASIC');
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
  
  return { success: result.success, error: result.error };
}

export async function createBacklogTickets(
  userId: number,
  currentVisionId: number,
  organizationId: number,
  reasonType: TicketReasonType = 'BACKLOG',
  triggerLevel?: VisionLevel
): Promise<BacklogTicketResult> {
  return processBacklogForAllPaidLevels(userId, currentVisionId, organizationId, reasonType, triggerLevel || 'BASIC');
}
