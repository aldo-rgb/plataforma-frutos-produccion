import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

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
 *    - Genera ticket ADVANCED para siguiente visión (si estaba PAGADO COMPLETO)
 *    - Genera ticket PL para siguiente visión (si estaba PAGADO COMPLETO)
 *    → El usuario tendrá que repetir toda la trilogía en la siguiente visión
 * 
 * 2. DROP/BACKLOG en AVANZADO (ya pasó básico, tenía PL):
 *    - Genera ticket ADVANCED para siguiente visión
 *    - Si PL estaba RESERVED (solo depósito): CANCELA y PIERDE el depósito
 *    - Si PL estaba ACTIVE (pagado completo): CANCELA y RE-CREA para siguiente
 *    → El usuario hará ADVANCED (+PL si lo tenía pagado completo) en la siguiente visión
 * 
 * 3. DROP/BACKLOG en LIDERATO (ya pasó básico y avanzado):
 *    - Solo genera ticket PL para siguiente visión
 *    → El usuario solo repetirá PL
 * 
 * REGLA IMPORTANTE:
 * - Cada nivel tiene UNA sola oportunidad de reposición
 * - Si ya usaste tu oportunidad de BASIC, no recibes otro ticket de BASIC
 * - Tickets RESERVED (apartados/depósitos) NO generan reposición - se pierde el depósito
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
    // 3. CANCELAR TICKETS ORIGINALES (incluye el nivel trigger y superiores)
    // Distinguir entre tickets PAGADOS COMPLETOS vs RESERVADOS (depósito)
    // ========================================
    const reservedLevelsLostDeposit: VisionLevel[] = []; // Niveles que pierden depósito
    
    for (const level of levelsToProcess) {
      // Cancelar TODOS los tickets de los niveles a procesar (incluyendo el trigger)
      const levelIndex = LEVEL_ORDER.indexOf(level);
      
      if (levelIndex >= triggerIndex) {
        // Buscar ticket de este nivel (ACTIVE o RESERVED)
        const existingTicket = await prisma.ticket.findFirst({
          where: {
            ownerId: userId,
            visionId: currentVisionId,
            level: level,
            status: { in: ['ACTIVE', 'RESERVED', 'PENDING_PAYMENT'] }
          },
          select: {
            id: true,
            status: true,
            amountPaid: true,
            costAtPurchase: true,
            type: true
          }
        });

        if (existingTicket) {
          // Cancelar el ticket
          await prisma.ticket.update({
            where: { id: existingTicket.id },
            data: { status: 'CANCELLED' }
          });
          
          // Determinar si era RESERVED (solo depósito) - pierde el dinero
          const isReservedOrPartialPayment = 
            (existingTicket.status as string) === 'RESERVED' ||
            (existingTicket.type as string) === 'PROMO_RESERVED' ||
            (Number(existingTicket.amountPaid) > 0 && 
             Number(existingTicket.amountPaid) < Number(existingTicket.costAtPurchase || 0));
          
          if (isReservedOrPartialPayment) {
            // Ticket con depósito parcial - NO genera reposición, pierde el dinero
            reservedLevelsLostDeposit.push(level);
            console.log(`💸 Ticket ${level} RESERVADO cancelado - depósito perdido: $${existingTicket.amountPaid}`);
          } else {
            // Ticket pagado completo - SÍ genera reposición
            cancelledTickets.push({ level, ticketId: existingTicket.id });
            console.log(`🚫 Ticket ${level} PAGADO cancelado: ${existingTicket.id} - generará reposición`);
          }
        }

        // Marcar enrollment de niveles superiores como CANCELLED (no MOVED)
        const enrollmentToUpdate = userEnrollments.find(e => e.level === level);
        if (enrollmentToUpdate && enrollmentToUpdate.attendanceStatus !== 'ATTENDED') {
          const isLostDeposit = reservedLevelsLostDeposit.includes(level);
          await prisma.vision_enrollments.update({
            where: { id: enrollmentToUpdate.id },
            data: { 
              attendanceStatus: isLostDeposit ? 'CANCELLED' : 'MOVED',
              enrollmentStatus: isLostDeposit ? 'CANCELLED' : 'MOVED_TO_NEXT'
            }
          });
          console.log(`📦 Enrollment ${level} marcado como ${isLostDeposit ? 'CANCELLED' : 'MOVED'}`);
        }
      }
    }
    
    // Filtrar niveles a procesar: excluir los que perdieron depósito
    const levelsToCreateTickets = levelsToProcess.filter(
      level => !reservedLevelsLostDeposit.includes(level)
    );
    
    console.log(`📋 Niveles que generarán ticket de reposición: ${levelsToCreateTickets.join(', ') || 'ninguno'}`);
    if (reservedLevelsLostDeposit.length > 0) {
      console.log(`💸 Niveles que perdieron depósito (sin reposición): ${reservedLevelsLostDeposit.join(', ')}`);
    }

    // ========================================
    // 4. CREAR TICKETS PARA CADA NIVEL (solo los que califican)
    // ========================================
    for (const level of levelsToCreateTickets) {
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
    
    // Agregar info de niveles que perdieron depósito (sin ticket creado)
    for (const level of reservedLevelsLostDeposit) {
      results.push({
        level,
        success: false,
        error: 'Depósito perdido - ticket era RESERVADO (no pagado completo)',
        alreadyUsedBacklog: false
      });
    }

    // ========================================
    // 5. ENVIAR NOTIFICACIONES
    // ========================================
    const successfulTickets = results.filter(r => r.success);
    const failedAlreadyUsed = results.filter(r => r.alreadyUsedBacklog);
    const lostDeposits = results.filter(r => r.error?.includes('Depósito perdido'));

    if (successfulTickets.length > 0 || lostDeposits.length > 0) {
      const reasonLabel = reasonType === 'DROP' ? 'DROP (baja)' : 'BACKLOG';
      const levelsCreated = successfulTickets.map(t => getLevelLabel(t.level)).join(', ');
      
      let message = '';
      
      if (cancelledTickets.length > 0 || lostDeposits.length > 0) {
        const levelsCancelled = cancelledTickets.map(c => getLevelLabel(c.level)).join(', ');
        const levelsLost = lostDeposits.map(l => getLevelLabel(l.level)).join(', ');
        
        message = `Por tu situación de ${reasonLabel} en ${getLevelLabel(triggerLevel)}, se han reorganizado tus tickets:\n\n`;
        
        if (levelsCreated) {
          message += `✅ Tickets generados para siguiente visión: ${levelsCreated}\n`;
        }
        if (levelsCancelled) {
          message += `🔄 Tickets movidos de visión actual: ${levelsCancelled}\n`;
        }
        if (levelsLost) {
          message += `❌ Niveles cancelados (depósito perdido): ${levelsLost}\n`;
        }
        
        message += `\nDeberás completar los niveles asignados en la próxima visión.`;
      } else if (successfulTickets.length > 0) {
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
    
    // Notificación específica para depósitos perdidos
    if (lostDeposits.length > 0) {
      const levelsLost = lostDeposits.map(l => getLevelLabel(l.level)).join(', ');
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '💸 Depósito Perdido',
          message: `Tu depósito/apartado para ${levelsLost} se ha perdido debido a tu inasistencia a ${getLevelLabel(triggerLevel)}. Los anticipos no son reembolsables cuando no se completa el nivel anterior.`,
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
        id: crypto.randomUUID(),
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
        validUntil: validUntil,
        updatedAt: new Date(),
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
