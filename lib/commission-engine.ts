import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Motor de Cálculo Automático de Comisiones para Coordinadores
 * 
 * Este módulo contiene las reglas de negocio para generar comisiones automáticamente
 * cuando ocurren eventos específicos en el sistema.
 */

interface CommissionTriggerData {
  coordinatorId: number;
  relatedUserId: number;
  visionId: number;
  organizationId: number;
  enrollmentId?: number;
  coordinatorRole: 'COORDINATOR_BASIC' | 'COORDINATOR_ADVANCED' | 'COORDINATOR_PL';
  notes?: string;
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
    const existing = await prisma.coordinatorCommission.findFirst({
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
    const commission = await prisma.coordinatorCommission.create({
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
 * Trigger: Cuando un alumno que completó Básico se inscribe en Avanzado Y asiste
 * Comisión: $500 (por defecto) para el Coordinador Avanzado
 * 
 * Candados:
 * - El alumno debe haber completado Básico
 * - El alumno debe tener attendanceStatus = 'ATTENDED_ADVANCED'
 * - El alumno debe tener paymentStatus = 'PAID_FULL' en Avanzado
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

    // Verificar que no exista ya una comisión
    const existing = await prisma.coordinatorCommission.findFirst({
      where: {
        coordinatorId: data.coordinatorId,
        relatedUserId: data.relatedUserId,
        triggerEvent: 'ADVANCE_SEATED',
        visionId: data.visionId
      }
    });

    if (existing) {
      console.log('ℹ️  Comisión ya existe, saltando...');
      return existing;
    }

    const config = await getCommissionConfig(data.visionId);

    const commission = await prisma.coordinatorCommission.create({
      data: {
        coordinatorId: data.coordinatorId,
        coordinatorRole: data.coordinatorRole,
        triggerEvent: 'ADVANCE_SEATED',
        relatedUserId: data.relatedUserId,
        relatedEnrollmentId: advanceEnrollment.id,
        amount: config.advanceSeatedRate,
        visionId: data.visionId,
        organizationId: data.organizationId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: config.advanceSeatedRate.toString(),
          configId: config.id
        },
        notes: data.notes || 'Comisión automática por alumno en Avanzado',
        updatedAt: new Date()
      }
    });

    console.log('✅ Comisión ADVANCE_SEATED creada:', commission.id, '- Monto:', commission.amount);
    return commission;

  } catch (error) {
    console.error('❌ Error en triggerAdvanceSeatedCommission:', error);
    throw error;
  }
}

/**
 * REGLA 3: Alumno Inició PL
 * 
 * Trigger: Cuando un alumno se inscribe en PL (su propia tribu)
 * Comisión: $400 (por defecto) para el Coordinador PL
 * 
 * Candados:
 * - El alumno debe tener paymentStatus = 'PAID_FULL'
 * - El alumno no fue invitado por nadie (es inicio de su propia tribu)
 */
export async function triggerPLStartCommission(data: CommissionTriggerData) {
  try {
    console.log('🎯 Trigger: PL_START para usuario', data.relatedUserId);

    const enrollment = await prisma.visionEnrollment.findFirst({
      where: {
        userId: data.relatedUserId,
        visionId: data.visionId,
        level: 'PL',
        paymentStatus: 'PAID_FULL',
        invitedBy: null // No fue invitado, es su propia tribu
      }
    });

    if (!enrollment) {
      console.log('⚠️  Candado no cumplido: no pagó completo o fue invitado por alguien');
      return null;
    }

    const existing = await prisma.coordinatorCommission.findFirst({
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

    const commission = await prisma.coordinatorCommission.create({
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
        notes: data.notes || 'Comisión automática por inicio de PL (tribu propia)',
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
    const existing = await prisma.coordinatorCommission.findFirst({
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

    const commission = await prisma.coordinatorCommission.create({
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

    const existing = await prisma.coordinatorCommission.findFirst({
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

    const commission = await prisma.coordinatorCommission.create({
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
