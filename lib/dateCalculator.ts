import { addDays, differenceInDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { prisma } from './prisma';

/**
 * Motor de Cálculo de Fechas para Ciclos Híbridos
 * 
 * REGLAS DE NEGOCIO:
 * 1. Usuario SOLO (sin visión) → 63 días desde aprobación de carta
 * 2. Usuario VISIÓN (en grupo) → Hasta Vision.endDate
 * 3. Si el usuario entra tarde a visión → Genera solo días restantes
 * 4. El ciclo se crea SOLO cuando la carta es aprobada
 */

export interface CycleDates {
  startDate: Date;
  endDate: Date;
  cycleType: 'SOLO' | 'VISION';
  totalDays: number;
  visionId?: number;
  visionName?: string;
}

/**
 * Calcula las fechas de inicio y fin del ciclo para un usuario
 * @param userId - ID del usuario
 * @param customStartDate - Fecha de inicio personalizada (opcional, default: hoy)
 * @returns Objeto con fechas calculadas y tipo de ciclo
 */
export async function calculateCycleDates(
  userId: number,
  customStartDate?: Date
): Promise<CycleDates> {
  // Obtener usuario  
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      vision: true
    }
  });

  if (!user) {
    throw new Error(`Usuario con ID ${userId} no encontrado`);
  }

  // Crear fecha en hora LOCAL del servidor (México) a medianoche
  // Para compensar el UTC-6 de México, creamos la fecha a las 12:00 PM (mediodía)
  // Así cuando se almacene en UTC será 18:00 UTC del MISMO DÍA
  // y al mostrarse en México será 12:00 PM (mediodía) del MISMO DÍA
  const baseDate = customStartDate || new Date();
  let startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0, 0);
  
  // 🚨 VALIDACIÓN CRÍTICA: NUNCA usar fechas pasadas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (startDate < today) {
    console.warn(`⚠️ ADVERTENCIA: Se intentó usar fecha pasada ${startDate.toISOString().split('T')[0]} para ciclo. Usando HOY en su lugar.`);
    startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  }
  
  let endDate: Date;
  let cycleType: 'SOLO' | 'VISION';
  let visionId: number | undefined;
  let visionName: string | undefined;

  // Por ahora, el campo `vision` es solo texto y no hay modelo Vision
  // Todos los usuarios son SOLO con ciclo de 90 días
  if (user.vision) {
    // FUTURO: Aquí se manejaría la lógica de visión si existiera el modelo
    console.log(`⚠️  Usuario tiene vision text: "${user.vision}", pero no hay modelo Vision implementado. Usando SOLO mode.`);
  }
  
  // =============================================
  // MODO SOLO (63 DÍAS)
  // =============================================
  cycleType = 'SOLO';
  endDate = addDays(startDate, 63);

  console.log(`📅 Usuario #${userId} en MODO SOLO`);
  console.log(`   Ciclo personal: 63 días (hasta ${endDate.toISOString().split('T')[0]})`);

  const totalDays = differenceInDays(endDate, startDate) + 1; // +1 para incluir el día final

  return {
    startDate,
    endDate,
    cycleType,
    totalDays,
    visionId,
    visionName
  };
}

/**
 * Verifica si un usuario puede iniciar un nuevo ciclo
 * @param userId - ID del usuario
 * @returns Objeto con validación y mensaje
 */
export async function canStartNewCycle(userId: number): Promise<{
  canStart: boolean;
  reason?: string;
  activeEnrollment?: any;
}> {
  // Buscar inscripción activa
  const activeEnrollment = await prisma.programEnrollment.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE'
    }
  });

  if (activeEnrollment) {
    return {
      canStart: false,
      reason: `Ya tienes un ciclo activo hasta ${new Date(activeEnrollment.cycleEndDate || activeEnrollment.endDate).toLocaleDateString()}`,
      activeEnrollment
    };
  }

  return { canStart: true };
}

/**
 * Crea una nueva inscripción (enrollment) para un usuario
 * @param userId - ID del usuario
 * @param cycleDates - Fechas calculadas del ciclo
 * @returns Enrollment creado
 */
export async function createEnrollment(userId: number, cycleDates: CycleDates) {
  // Obtener mentor del usuario
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { assignedMentorId: true }
  });

  if (!user?.assignedMentorId) {
    throw new Error(`Usuario ${userId} no tiene mentor asignado`);
  }

  return await prisma.programEnrollment.create({
    data: {
      userId: userId,
      mentorId: user.assignedMentorId,
      startDate: cycleDates.startDate,
      endDate: cycleDates.endDate,
      cycleType: cycleDates.cycleType,
      cycleStartDate: cycleDates.startDate,
      cycleEndDate: cycleDates.endDate,
      status: 'ACTIVE',
      updatedAt: new Date()
    }
  });
}

/**
 * Calcula cuántos días faltan desde una fecha hasta el fin de un ciclo
 * Útil para extensiones de visión
 * @param fromDate - Fecha desde donde calcular
 * @param userId - ID del usuario
 * @returns Número de días restantes
 */
export async function calculateRemainingDays(
  fromDate: Date,
  userId: number
): Promise<number> {
  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      usuarioId: userId,
      status: 'ACTIVE'
    }
  });

  if (!enrollment) {
    throw new Error(`Usuario #${userId} no tiene un ciclo activo`);
  }

  const remaining = differenceInDays(
    startOfDay(new Date(enrollment.cycleEndDate)),
    startOfDay(fromDate)
  );

  return Math.max(0, remaining);
}

/**
 * Obtiene el último día con tareas generadas para un usuario
 * Útil para extensiones
 * @param userId - ID del usuario
 * @returns Fecha de la última tarea o null
 */
export async function getLastTaskDate(userId: number): Promise<Date | null> {
  const lastTask = await prisma.tarea.findFirst({
    where: { usuarioId: userId },
    orderBy: { dueDate: 'desc' },
    select: { dueDate: true }
  });

  return lastTask ? startOfDay(new Date(lastTask.dueDate)) : null;
}

/**
 * Valida si una fecha de extensión es válida
 * @param currentEndDate - Fecha actual de fin
 * @param newEndDate - Nueva fecha propuesta
 * @returns Objeto con validación
 */
export function validateExtensionDate(
  currentEndDate: Date,
  newEndDate: Date
): { isValid: boolean; reason?: string; additionalDays?: number } {
  const current = startOfDay(new Date(currentEndDate));
  const newDate = startOfDay(new Date(newEndDate));

  if (isBefore(newDate, current)) {
    return {
      isValid: false,
      reason: 'La nueva fecha no puede ser anterior a la fecha actual de fin'
    };
  }

  if (newDate.getTime() === current.getTime()) {
    return {
      isValid: false,
      reason: 'La nueva fecha es igual a la fecha actual'
    };
  }

  const additionalDays = differenceInDays(newDate, current);

  return {
    isValid: true,
    additionalDays
  };
}

/**
 * Calcula estadísticas del ciclo de un usuario
 * @param userId - ID del usuario
 * @returns Estadísticas del ciclo
 */
export async function getCycleStats(userId: number) {
  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      usuarioId: userId,
      status: 'ACTIVE'
    },
    include: {
      Vision: {
        select: { name: true, status: true }
      }
    }
  });

  if (!enrollment) {
    return null;
  }

  const now = startOfDay(new Date());
  const startDate = startOfDay(new Date(enrollment.cycleStartDate));
  const endDate = startOfDay(new Date(enrollment.cycleEndDate));

  const totalDays = differenceInDays(endDate, startDate) + 1;
  const daysElapsed = differenceInDays(now, startDate);
  const daysRemaining = differenceInDays(endDate, now);
  const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  return {
    cycleType: enrollment.cycleType,
    visionName: enrollment.Vision?.name,
    startDate: enrollment.cycleStartDate,
    endDate: enrollment.cycleEndDate,
    totalDays,
    daysElapsed,
    daysRemaining: Math.max(0, daysRemaining),
    progressPercentage: Math.round(progressPercentage * 100) / 100,
    status: enrollment.status
  };
}
