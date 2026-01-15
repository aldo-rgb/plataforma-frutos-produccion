import { prisma } from '@/lib/prisma';

interface BacklogTicketResult {
  success: boolean;
  ticketId?: string;
  visionName?: string;
  isPendingAssignment?: boolean; // True si no hay próxima visión y está pendiente de asignar
  error?: string;
  alreadyUsedBacklog?: boolean; // True si ya usó su oportunidad de BACKLOG
}

/**
 * Genera un ticket BACKLOG para el siguiente básico vigente.
 * Si no hay próximo básico, crea un ticket "pendiente de asignar" como comprobante.
 * 
 * REGLAS:
 * - Solo se puede generar 1 ticket BACKLOG por usuario (oportunidad única)
 * - El ticket NO es transferible
 * - Si ya usó su oportunidad BACKLOG previamente, no se genera nuevo ticket
 * 
 * @param userId - ID del usuario que fue marcado como BACKLOG
 * @param currentVisionId - ID de la visión actual del enrollment
 * @param organizationId - ID de la organización del usuario
 * @returns Resultado con el ticket creado o error
 */
export async function createBacklogTicket(
  userId: number,
  currentVisionId: number,
  organizationId: number
): Promise<BacklogTicketResult> {
  try {
    const now = new Date();
    
    // ========================================
    // VERIFICAR SI YA USÓ SU OPORTUNIDAD BACKLOG
    // Un usuario solo puede tener 1 ticket BACKLOG en su vida
    // ========================================
    const existingBacklogTicket = await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        type: 'SCHOLARSHIP', // Usamos SCHOLARSHIP para tickets BACKLOG
        level: 'BASIC',
        // Verificar que sea un ticket de cortesía (amountPaid = 0)
        amountPaid: 0
      }
    });

    if (existingBacklogTicket) {
      console.log(`⚠️ Usuario ${userId} ya usó su oportunidad BACKLOG (ticket ${existingBacklogTicket.id})`);
      
      // Notificar al usuario que ya no tiene derecho a otro ticket BACKLOG
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '⚠️ Oportunidad de Reposición Agotada',
          message: 'Ya utilizaste tu única oportunidad de reposición por BACKLOG anteriormente. Esta vez no se generará un nuevo ticket. Contacta a tu coordinador si necesitas ayuda.',
          relatedId: currentVisionId
        }
      });

      return {
        success: false,
        alreadyUsedBacklog: true,
        error: 'Ya utilizaste tu única oportunidad de ticket BACKLOG'
      };
    }

    // ========================================
    // BUSCAR PRÓXIMA VISIÓN BASIC
    // ========================================
    const nextBasicVision = await prisma.vision.findFirst({
      where: {
        organizationId: organizationId,
        startDate: {
          gt: now // Fecha de inicio mayor a ahora (aún no ha iniciado)
        },
        id: {
          not: currentVisionId // Excluir la visión actual
        }
      },
      orderBy: {
        startDate: 'asc' // La más próxima primero
      },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        organizationId: true
      }
    });

    // Si no hay próxima visión, usar la visión actual para crear el ticket pendiente
    const targetVision = nextBasicVision || await prisma.vision.findUnique({
      where: { id: currentVisionId },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        organizationId: true
      }
    });

    if (!targetVision) {
      return {
        success: false,
        error: 'No se encontró visión para asignar el ticket'
      };
    }

    const isPendingAssignment = !nextBasicVision;

    // ========================================
    // CREAR TICKET BACKLOG
    // ========================================
    const newTicket = await prisma.ticket.create({
      data: {
        ownerId: userId,
        organizationId: organizationId,
        visionId: targetVision.id,
        level: 'BASIC',
        type: 'SCHOLARSHIP', // Tipo SCHOLARSHIP para tickets de cortesía/BACKLOG
        status: isPendingAssignment ? 'PENDING_PAYMENT' : 'ACTIVE', // Pendiente si no hay visión asignada
        paymentStatus: 'GIFT', // Es un regalo/cortesía
        isTransferable: false, // ⚠️ NO TRANSFERIBLE
        purchasePrice: 0,
        amountPaid: 0,
        validUntil: isPendingAssignment 
          ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()) // Válido por 1 año si está pendiente
          : targetVision.startDate // Válido hasta que inicie el próximo básico
      }
    });

    // ========================================
    // NOTIFICACIONES AL USUARIO
    // ========================================
    if (isPendingAssignment) {
      // No hay próxima visión - Ticket pendiente de asignar
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'OTHER',
          title: '🎫 Ticket de Reposición Generado',
          message: `Se te ha generado un ticket de cortesía por tu situación de BACKLOG. Actualmente no hay un próximo entrenamiento básico programado, pero tu ticket está guardado y podrás usarlo cuando se programe uno nuevo. ⚠️ IMPORTANTE: Este ticket NO es transferible y solo puedes obtenerlo UNA VEZ.`,
          relatedId: parseInt(newTicket.id.replace(/-/g, '').slice(0, 8), 16)
        }
      });

      // Segunda notificación con instrucciones
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '📋 Instrucciones de tu Ticket BACKLOG',
          message: 'Tu ticket de reposición aparecerá en la sección "Mis Tickets" de tu perfil. Cuando se programe el próximo entrenamiento básico, contacta a tu coordinador para que te asigne a esa visión. Recuerda: si vuelves a no asistir, NO se generará otro ticket de cortesía.',
          relatedId: parseInt(newTicket.id.replace(/-/g, '').slice(0, 8), 16)
        }
      });
    } else {
      // Hay próxima visión - Ticket asignado
      const startDateFormatted = targetVision.startDate 
        ? targetVision.startDate.toLocaleDateString('es-MX', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'fecha por confirmar';
      
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'OTHER',
          title: '🎫 Ticket para Siguiente Entrenamiento',
          message: `Se te ha asignado un ticket de cortesía para "${targetVision.nombre}" que inicia el ${startDateFormatted}. ⚠️ IMPORTANTE: Este ticket NO es transferible y es tu ÚNICA oportunidad de reposición por BACKLOG.`,
          relatedId: parseInt(newTicket.id.replace(/-/g, '').slice(0, 8), 16)
        }
      });

      // Segunda notificación de advertencia
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '⚠️ Advertencia sobre tu Ticket',
          message: 'Este ticket de reposición es tu ÚNICA oportunidad. Si vuelves a no asistir al entrenamiento, NO se generará otro ticket de cortesía. Asegúrate de confirmar tu asistencia con tu coordinador.',
          relatedId: parseInt(newTicket.id.replace(/-/g, '').slice(0, 8), 16)
        }
      });
    }

    console.log(`✅ Ticket BACKLOG creado: ${newTicket.id} para usuario ${userId} -> ${isPendingAssignment ? 'PENDIENTE DE ASIGNAR' : targetVision.nombre}`);

    return {
      success: true,
      ticketId: newTicket.id,
      visionName: isPendingAssignment ? 'Pendiente de asignar' : targetVision.nombre,
      isPendingAssignment
    };

  } catch (error: any) {
    console.error(`❌ Error creando ticket BACKLOG para usuario ${userId}:`, error);
    return {
      success: false,
      error: error?.message || 'Error desconocido'
    };
  }
}

/**
 * Procesa múltiples usuarios marcados como BACKLOG y crea tickets para todos.
 * 
 * @param enrollments - Lista de enrollments marcados como BACKLOG
 * @returns Resumen de tickets creados
 */
export async function createBacklogTicketsForEnrollments(
  enrollments: Array<{ userId: number; visionId: number; organizationId: number }>
): Promise<{
  ticketsCreated: number;
  ticketsFailed: number;
  ticketsAlreadyUsed: number;
  details: BacklogTicketResult[];
}> {
  const results: BacklogTicketResult[] = [];
  
  for (const enrollment of enrollments) {
    const result = await createBacklogTicket(
      enrollment.userId,
      enrollment.visionId,
      enrollment.organizationId
    );
    results.push(result);
  }

  return {
    ticketsCreated: results.filter(r => r.success && r.ticketId).length,
    ticketsFailed: results.filter(r => !r.success && !r.alreadyUsedBacklog).length,
    ticketsAlreadyUsed: results.filter(r => r.alreadyUsedBacklog).length,
    details: results
  };
}
