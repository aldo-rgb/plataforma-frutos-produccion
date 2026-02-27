import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Motor de Cálculo Automático de Comisiones para Coordinadores
 * QUANTUM WALLET - Sistema de Pagos por Check-in
 * 
 * REGLAS DE NEGOCIO:
 * - Las comisiones se pagan cuando el participante SE SIENTA (Check-in), NO cuando compra
 * - Básico: $300 por sentado (check-in día 1)
 * - Avanzado: $500 normal / $700 si compró Combo ANTES del inicio
 * - PL: $400 arranque (semana 1) + $400 cierre (semana 3) + $400 por invitado
 */

interface CommissionTriggerData {
  coordinatorId: number;
  relatedUserId: number;
  visionId: number;
  organizationId: number;
  enrollmentId?: number;
  coordinatorRole: 'COORDINATOR_BASIC' | 'COORDINATOR_ADVANCED' | 'COORDINATOR_PL';
  notes?: string;
  checkInTimestamp?: Date;
}

/**
 * Obtener configuración de comisiones de una visión
 */
async function getCommissionConfig(visionId: number) {
  let config = await prisma.coordinatorCommissionConfig.findUnique({
    where: { visionId }
  });

  // Si no existe configuración, crear una con valores por defecto
  if (!config) {
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { organizationId: true, coordinadorId: true }
    });

    if (!vision || !vision.organizationId) {
      throw new Error(`Visión ${visionId} no encontrada o sin organización`);
    }

    config = await prisma.coordinatorCommissionConfig.create({
      data: {
        visionId,
        organizationId: vision.organizationId,
        createdBy: vision.coordinadorId,
        updatedAt: new Date()
      }
    });
  }

  return config;
}

/**
 * REGLA 1: Alumno Nuevo Sentado en Básico
 * 
 * Trigger: Cuando se marca asistencia de un alumno Y tiene pago completo
 * Comisión: $300 (por defecto) para el Coordinador Básico
 * 
 * Candados:
 * - El alumno debe tener paymentStatus = 'PAID_FULL'
 * - El alumno debe tener attendanceStatus = 'ATTENDED_BASIC'
 */
export async function triggerBasicSeatedCommission(data: CommissionTriggerData) {
  try {
    console.log('🎯 Trigger: BASIC_SEATED para usuario', data.relatedUserId);

    // Verificar que el alumno esté sentado y haya pagado
    const enrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'BASIC',
        attendanceStatus: 'ATTENDED_BASIC',
        paymentStatus: 'PAID_FULL'
      }
    });

    if (!enrollment) {
      console.log('⚠️  Candado no cumplido: alumno no asistió o no pagó completo');
      return null;
    }

    // Verificar que no exista ya una comisión por este evento
    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId: data.coordinatorId,
        relatedUserId: data.relatedUserId,
        triggerEvent: 'BASIC_SEATED',
        visionId: data.visionId
      }
    });

    if (existing) {
      console.log('ℹ️  Comisión ya existe, saltando...');
      return existing;
    }

    // Obtener configuración de tarifas
    const config = await getCommissionConfig(data.visionId);

    // Crear comisión
    const commission = await prisma.coordinator_commissions.create({
      data: {
        coordinatorId: data.coordinatorId,
        coordinatorRole: data.coordinatorRole,
        triggerEvent: 'BASIC_SEATED',
        relatedUserId: data.relatedUserId,
        relatedEnrollmentId: enrollment.id,
        amount: config.basicSeatedRate,
        visionId: data.visionId,
        organizationId: data.organizationId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: config.basicSeatedRate.toString(),
          configId: config.id
        },
        notes: data.notes || 'Comisión automática por alumno sentado en Básico',
        updatedAt: new Date()
      }
    });

    console.log('✅ Comisión BASIC_SEATED creada:', commission.id, '- Monto:', commission.amount);
    return commission;

  } catch (error) {
    console.error('❌ Error en triggerBasicSeatedCommission:', error);
    throw error;
  }
}

/**
 * REGLA 2: Alumno Cruzó a Avanzado
 * 
 * Trigger: Staff escanea QR el día 1 de Avanzado
 * Comisión: 
 *   - $500 si compró "Solo Avanzado"
 *   - $700 si compró "Combo Avanzado+PL" ANTES de la fecha de inicio del evento
 * 
 * Candados:
 * - El alumno debe haber completado Básico
 * - El alumno debe tener check-in (attendanceStatus = 'ATTENDED_ADVANCED')
 * - El alumno debe tener paymentStatus = 'PAID_FULL'
 */
export async function triggerAdvanceSeatedCommission(data: CommissionTriggerData) {
  try {
    console.log('🎯 Trigger: ADVANCE_SEATED para usuario', data.relatedUserId);

    // Verificar que el alumno completó básico
    const basicEnrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'BASIC',
        enrollmentStatus: 'COMPLETED'
      }
    });

    if (!basicEnrollment) {
      console.log('⚠️  Candado no cumplido: alumno no completó Básico');
      return null;
    }

    // Verificar que esté sentado en Avanzado y haya pagado
    const advanceEnrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'ADVANCED',
        attendanceStatus: 'ATTENDED_ADVANCED',
        paymentStatus: 'PAID_FULL'
      }
    });

    if (!advanceEnrollment) {
      console.log('⚠️  Candado no cumplido: alumno no asistió a Avanzado o no pagó');
      return null;
    }

    // Verificar que no exista ya una comisión (ni ADVANCE_SEATED ni ADVANCE_COMBO_SEATED)
    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId: data.coordinatorId,
        relatedUserId: data.relatedUserId,
        triggerEvent: { in: ['ADVANCE_SEATED', 'ADVANCE_COMBO_SEATED'] },
        visionId: data.visionId
      }
    });

    if (existing) {
      console.log('ℹ️  Comisión ya existe, saltando...');
      return existing;
    }

    const config = await getCommissionConfig(data.visionId);

    // Determinar si es Combo: verificar si tiene inscripción a PL
    const plEnrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'PL'
      }
    });

    // Obtener fecha de inicio del evento Avanzado
    const vision = await prisma.vision.findUnique({
      where: { id: data.visionId },
      select: { 
        organizationId: true,
        SchoolProduct: {
          where: { productType: 'ADVANCED' },
          select: { 
            startDate: true,
            EventDate: { select: { eventDate: true }, take: 1 }
          },
          take: 1
        }
      }
    });

    let isCombo = false;
    let triggerEvent: 'ADVANCE_SEATED' | 'ADVANCE_COMBO_SEATED' = 'ADVANCE_SEATED';

    // Si tiene inscripción a PL, verificar si la compró ANTES del inicio del Avanzado
    if (plEnrollment && vision?.SchoolProduct?.[0]) {
      const advancedStartDate = vision.SchoolProduct[0].startDate || 
                                vision.SchoolProduct[0].EventDate?.[0]?.eventDate;
      
      if (advancedStartDate && plEnrollment.enrolledAt < advancedStartDate) {
        isCombo = true;
        triggerEvent = 'ADVANCE_COMBO_SEATED';
        console.log('🎁 Detectado COMBO: PL comprado antes del inicio de Avanzado');
      }
    }

    const amount = isCombo ? config.advanceComboRate : config.advanceSeatedRate;

    const commission = await prisma.coordinator_commissions.create({
      data: {
        coordinatorId: data.coordinatorId,
        coordinatorRole: data.coordinatorRole,
        triggerEvent,
        relatedUserId: data.relatedUserId,
        relatedEnrollmentId: advanceEnrollment.id,
        amount,
        visionId: data.visionId,
        organizationId: data.organizationId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: amount.toString(),
          configId: config.id,
          isCombo,
          plEnrolledAt: plEnrollment?.enrolledAt?.toISOString() || null
        },
        notes: isCombo 
          ? 'Comisión automática por alumno COMBO en Avanzado (+PL anticipado)'
          : 'Comisión automática por alumno en Avanzado',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Comisión ${triggerEvent} creada:`, commission.id, '- Monto:', commission.amount);
    return commission;

  } catch (error) {
    console.error('❌ Error en triggerAdvanceSeatedCommission:', error);
    throw error;
  }
}

/**
 * REGLA 3: Alumno Inició PL (Fin de Semana 1)
 * 
 * Trigger: Escaneo de QR en Fin de Semana 1 del PL
 * Comisión: $400 (por defecto) para el Coordinador PL
 * 
 * Candados:
 * - El alumno debe tener paymentStatus = 'PAID_FULL'
 * - Debe ser check-in de semana 1
 */
export async function triggerPLStartCommission(data: CommissionTriggerData) {
  try {
    console.log('🎯 Trigger: PL_START para usuario', data.relatedUserId);

    const enrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'PL',
        paymentStatus: 'PAID_FULL'
      }
    });

    if (!enrollment) {
      console.log('⚠️  Candado no cumplido: no pagó completo');
      return null;
    }

    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId: data.coordinatorId,
        relatedUserId: data.relatedUserId,
        triggerEvent: 'PL_START',
        visionId: data.visionId
      }
    });

    if (existing) {
      console.log('ℹ️  Comisión ya existe, saltando...');
      return existing;
    }

    const config = await getCommissionConfig(data.visionId);

    const commission = await prisma.coordinator_commissions.create({
      data: {
        coordinatorId: data.coordinatorId,
        coordinatorRole: data.coordinatorRole,
        triggerEvent: 'PL_START',
        relatedUserId: data.relatedUserId,
        relatedEnrollmentId: enrollment.id,
        amount: config.plStartRate,
        visionId: data.visionId,
        organizationId: data.organizationId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: config.plStartRate.toString(),
          configId: config.id
        },
        notes: data.notes || 'Comisión automática por check-in Semana 1 PL',
        updatedAt: new Date()
      }
    });

    console.log('✅ Comisión PL_START creada:', commission.id, '- Monto:', commission.amount);
    return commission;

  } catch (error) {
    console.error('❌ Error en triggerPLStartCommission:', error);
    throw error;
  }
}

/**
 * REGLA 3B: Alumno Check-in Semana 3 del PL (Cierre)
 * 
 * Trigger: Escaneo de QR en Fin de Semana 3 del PL
 * Comisión: $400 - Incentiva al coordinador a evitar deserción
 * 
 * Candados:
 * - El alumno debe tener check-in en semana 3
 * - El alumno NO debe ser desertor (DROPPED)
 */
export async function triggerPLWeek3Commission(data: CommissionTriggerData) {
  try {
    console.log('🎯 Trigger: PL_WEEK3_CHECKPOINT para usuario', data.relatedUserId);

    const enrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'PL',
        enrollmentStatus: { not: 'DROPPED' }
      }
    });

    if (!enrollment) {
      console.log('⚠️  Candado no cumplido: alumno no encontrado o es desertor');
      return null;
    }

    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId: data.coordinatorId,
        relatedUserId: data.relatedUserId,
        triggerEvent: 'PL_WEEK3_CHECKPOINT',
        visionId: data.visionId
      }
    });

    if (existing) {
      console.log('ℹ️  Comisión ya existe, saltando...');
      return existing;
    }

    const config = await getCommissionConfig(data.visionId);

    const commission = await prisma.coordinator_commissions.create({
      data: {
        coordinatorId: data.coordinatorId,
        coordinatorRole: data.coordinatorRole,
        triggerEvent: 'PL_WEEK3_CHECKPOINT',
        relatedUserId: data.relatedUserId,
        relatedEnrollmentId: enrollment.id,
        amount: config.plWeek3Rate,
        visionId: data.visionId,
        organizationId: data.organizationId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: config.plWeek3Rate.toString(),
          configId: config.id
        },
        notes: data.notes || 'Comisión automática por check-in Semana 3 PL (cierre)',
        updatedAt: new Date()
      }
    });

    console.log('✅ Comisión PL_WEEK3_CHECKPOINT creada:', commission.id, '- Monto:', commission.amount);
    return commission;

  } catch (error) {
    console.error('❌ Error en triggerPLWeek3Commission:', error);
    throw error;
  }
}

/**
 * REGLA 4: Invitado de PL Pagó (LA MÁS COMPLEJA)
 * 
 * Trigger: Cuando un invitado paga su Básico al 100%
 * Comisión: $400 (por defecto) para el Coordinador PL del alumno que invitó
 * 
 * Lógica:
 * 1. Luis fue invitado por Pedro
 * 2. Pedro está en la tribu del Coordinador Juan
 * 3. Cuando Luis paga -> Juan recibe comisión
 * 
 * Candados:
 * - El invitado (Luis) debe tener paymentStatus = 'PAID_FULL'
 * - Debe existir un invitedBy (Pedro)
 * - El que invitó (Pedro) debe tener un coordinador PL
 */
export async function triggerPLGuestPaidCommission(guestUserId: number, visionId: number) {
  try {
    console.log('🎯 Trigger: PL_GUEST_PAID para invitado', guestUserId);

    // Buscar enrollment del invitado
    const guestEnrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: guestUserId,
        visionId,
        paymentStatus: 'PAID_FULL',
        invitedBy: { not: null }
      }
    });

    if (!guestEnrollment || !guestEnrollment.invitedBy) {
      console.log('⚠️  Candado no cumplido: invitado no pagó completo o no tiene invitador');
      return null;
    }

    const inviterId = guestEnrollment.invitedBy;

    // Buscar el enrollment PL del que invitó
    const inviterEnrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: inviterId,
        visionId,
        level: 'PL'
      }
    });

    if (!inviterEnrollment) {
      console.log('⚠️  Candado no cumplido: el invitador no está en PL');
      return null;
    }

    const coordinatorId = inviterEnrollment.coordinatorId;

    // Verificar que no exista ya una comisión
    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId,
        relatedUserId: guestUserId,
        triggerEvent: 'PL_GUEST_PAID',
        visionId
      }
    });

    if (existing) {
      console.log('ℹ️  Comisión ya existe, saltando...');
      return existing;
    }

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { organizationId: true }
    });

    if (!vision?.organizationId) {
      throw new Error('Visión sin organización');
    }

    const config = await getCommissionConfig(visionId);

    const commission = await prisma.coordinator_commissions.create({
      data: {
        coordinatorId,
        coordinatorRole: 'COORDINATOR_PL',
        triggerEvent: 'PL_GUEST_PAID',
        relatedUserId: guestUserId,
        relatedEnrollmentId: guestEnrollment.id,
        amount: config.plGuestRate,
        visionId,
        organizationId: vision.organizationId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: config.plGuestRate.toString(),
          configId: config.id,
          invitedBy: inviterId
        },
        notes: `Comisión automática por invitado de usuario ${inviterId}`,
        updatedAt: new Date()
      }
    });

    console.log('✅ Comisión PL_GUEST_PAID creada:', commission.id, '- Monto:', commission.amount);
    return commission;

  } catch (error) {
    console.error('❌ Error en triggerPLGuestPaidCommission:', error);
    throw error;
  }
}

/**
 * REGLA 5: Graduación de PL
 * 
 * Trigger: Al finalizar el Fin de Semana 4 (graduación)
 * Comisión: $400 (por defecto) para el Coordinador PL
 * 
 * Candados:
 * - El alumno debe tener enrollmentStatus = 'GRADUATED'
 * - El alumno NO debe estar en estado 'DROPPED' (desertor)
 */
export async function triggerPLGraduationCommission(data: CommissionTriggerData) {
  try {
    console.log('🎯 Trigger: PL_GRADUATION para usuario', data.relatedUserId);

    const enrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'PL',
        enrollmentStatus: 'GRADUATED'
      }
    });

    if (!enrollment) {
      console.log('⚠️  Candado no cumplido: alumno no se graduó');
      return null;
    }

    // Verificar que no sea desertor
    if (enrollment.enrollmentStatus === 'DROPPED') {
      console.log('⚠️  Candado no cumplido: alumno es desertor');
      return null;
    }

    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId: data.coordinatorId,
        relatedUserId: data.relatedUserId,
        triggerEvent: 'PL_GRADUATION',
        visionId: data.visionId
      }
    });

    if (existing) {
      console.log('ℹ️  Comisión ya existe, saltando...');
      return existing;
    }

    const config = await getCommissionConfig(data.visionId);

    const commission = await prisma.coordinator_commissions.create({
      data: {
        coordinatorId: data.coordinatorId,
        coordinatorRole: data.coordinatorRole,
        triggerEvent: 'PL_GRADUATION',
        relatedUserId: data.relatedUserId,
        relatedEnrollmentId: enrollment.id,
        amount: config.plGradRate,
        visionId: data.visionId,
        organizationId: data.organizationId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: config.plGradRate.toString(),
          configId: config.id
        },
        notes: data.notes || 'Comisión automática por graduación de PL',
        updatedAt: new Date()
      }
    });

    console.log('✅ Comisión PL_GRADUATION creada:', commission.id, '- Monto:', commission.amount);
    return commission;

  } catch (error) {
    console.error('❌ Error en triggerPLGraduationCommission:', error);
    throw error;
  }
}

/**
 * Función auxiliar: Calcular próximo miércoles para fecha de pago
 */
export function getNextWednesday(fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  const dayOfWeek = date.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilWednesday);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * REGLA ESPECIAL: Ajuste por Reembolso/Contracargo
 * 
 * Cuando un participante solicita reembolso, se debe crear un débito
 * que descuente la comisión previamente pagada.
 * 
 * Ejemplo: Si María López pidió reembolso, se descuenta -$500
 */
export async function triggerRefundAdjustment(
  coordinatorId: number,
  relatedUserId: number,
  visionId: number,
  originalCommissionId: number,
  reason: string
) {
  try {
    console.log('🔄 Trigger: REFUND_ADJUSTMENT para usuario', relatedUserId);

    // Buscar la comisión original
    const originalCommission = await prisma.coordinator_commissions.findUnique({
      where: { id: originalCommissionId }
    });

    if (!originalCommission) {
      console.log('⚠️  Comisión original no encontrada');
      return null;
    }

    // Verificar que no exista ya un ajuste por esta comisión
    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId,
        relatedUserId,
        triggerEvent: 'REFUND_ADJUSTMENT',
        visionId,
        configSnapshot: {
          path: ['originalCommissionId'],
          equals: originalCommissionId
        }
      }
    });

    if (existing) {
      console.log('ℹ️  Ajuste ya existe, saltando...');
      return existing;
    }

    // Crear el débito (monto negativo)
    const negativeAmount = Number(originalCommission.amount) * -1;

    const adjustment = await prisma.coordinator_commissions.create({
      data: {
        coordinatorId,
        coordinatorRole: originalCommission.coordinatorRole,
        triggerEvent: 'REFUND_ADJUSTMENT',
        relatedUserId,
        relatedEnrollmentId: originalCommission.relatedEnrollmentId,
        amount: negativeAmount,
        visionId,
        organizationId: originalCommission.organizationId,
        status: 'AUTHORIZED', // Los ajustes se autorizan automáticamente
        configSnapshot: {
          originalCommissionId,
          originalAmount: originalCommission.amount.toString(),
          originalTrigger: originalCommission.triggerEvent,
          reason
        },
        notes: `Ajuste por reembolso: ${reason}`,
        updatedAt: new Date()
      }
    });

    // Marcar la comisión original como cancelada
    await prisma.coordinator_commissions.update({
      where: { id: originalCommissionId },
      data: { 
        status: 'CANCELLED',
        notes: `${originalCommission.notes || ''} | Cancelada por reembolso - Ajuste ID: ${adjustment.id}`,
        updatedAt: new Date()
      }
    });

    console.log('✅ Ajuste REFUND_ADJUSTMENT creado:', adjustment.id, '- Monto:', adjustment.amount);
    return adjustment;

  } catch (error) {
    console.error('❌ Error en triggerRefundAdjustment:', error);
    throw error;
  }
}

/**
 * Obtener resumen de wallet de un coordinador (Quantum Wallet)
 */
export async function getCoordinatorWalletSummary(coordinatorId: number) {
  try {
    const commissions = await prisma.coordinator_commissions.findMany({
      where: { 
        coordinatorId,
        status: { in: ['PENDING_REVIEW', 'AUTHORIZED', 'PAID'] }
      },
      include: {
        Usuario_coordinator_commissions_relatedUserIdToUsuario: {
          select: { nombre: true, email: true }
        },
        Vision: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular totales
    const summary = {
      totalAccumulated: 0,
      pendingReview: 0,
      authorized: 0,
      paid: 0,
      adjustments: 0
    };

    const transactions = commissions.map(c => {
      const amount = Number(c.amount);
      
      if (c.triggerEvent === 'REFUND_ADJUSTMENT') {
        summary.adjustments += amount;
      } else if (c.status === 'PENDING_REVIEW') {
        summary.pendingReview += amount;
      } else if (c.status === 'AUTHORIZED') {
        summary.authorized += amount;
      } else if (c.status === 'PAID') {
        summary.paid += amount;
      }
      
      summary.totalAccumulated += amount;

      return {
        id: c.id,
        date: c.createdAt,
        event: c.triggerEvent,
        studentName: c.Usuario_coordinator_commissions_relatedUserIdToUsuario?.nombre || 'Desconocido',
        visionName: c.Vision?.name || 'N/A',
        amount,
        status: c.status,
        notes: c.notes,
        isAdjustment: c.triggerEvent === 'REFUND_ADJUSTMENT'
      };
    });

    return {
      summary,
      transactions,
      lastUpdated: new Date()
    };

  } catch (error) {
    console.error('❌ Error en getCoordinatorWalletSummary:', error);
    throw error;
  }
}

/**
 * Mapeo de eventos a descripciones amigables
 */
export const TRIGGER_EVENT_LABELS: Record<string, string> = {
  'BASIC_SEATED': 'Check-in Básico',
  'ADVANCE_SEATED': 'Check-in Avanzado',
  'ADVANCE_COMBO_SEATED': 'Check-in Avanzado (Combo)',
  'PL_START': 'Check-in PL Semana 1',
  'PL_WEEK3_CHECKPOINT': 'Check-in PL Semana 3',
  'PL_GUEST_PAID': 'Bono por Invitado',
  'PL_GRADUATION': 'Graduación PL',
  'MANUAL_ADJUSTMENT': 'Ajuste Manual',
  'REFUND_ADJUSTMENT': 'Ajuste por Reembolso'
};
