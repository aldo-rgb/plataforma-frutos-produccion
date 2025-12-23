"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCycleDates = calculateCycleDates;
exports.canStartNewCycle = canStartNewCycle;
exports.createEnrollment = createEnrollment;
exports.calculateRemainingDays = calculateRemainingDays;
exports.getLastTaskDate = getLastTaskDate;
exports.validateExtensionDate = validateExtensionDate;
exports.getCycleStats = getCycleStats;
const date_fns_1 = require("date-fns");
const prisma_1 = require("./prisma");
/**
 * Calcula las fechas de inicio y fin del ciclo para un usuario
 * @param userId - ID del usuario
 * @param customStartDate - Fecha de inicio personalizada (opcional, default: hoy)
 * @returns Objeto con fechas calculadas y tipo de ciclo
 */
async function calculateCycleDates(userId, customStartDate) {
    // Obtener usuario  
    const user = await prisma_1.prisma.usuario.findUnique({
        where: { id: userId },
        select: {
            id: true,
            vision: true
        }
    });
    if (!user) {
        throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    const startDate = (0, date_fns_1.startOfDay)(customStartDate || new Date());
    let endDate;
    let cycleType;
    let visionId;
    let visionName;
    // Por ahora, el campo `vision` es solo texto y no hay modelo Vision
    // Todos los usuarios son SOLO con ciclo de 100 días
    if (user.vision) {
        // FUTURO: Aquí se manejaría la lógica de visión si existiera el modelo
        console.log(`⚠️  Usuario tiene vision text: "${user.vision}", pero no hay modelo Vision implementado. Usando SOLO mode.`);
    }
    // =============================================
    // MODO SOLO (100 DÍAS)
    // =============================================
    cycleType = 'SOLO';
    endDate = (0, date_fns_1.addDays)(startDate, 100);
    console.log(`📅 Usuario #${userId} en MODO SOLO`);
    console.log(`   Ciclo personal: 100 días (hasta ${endDate.toISOString().split('T')[0]})`);
    const totalDays = (0, date_fns_1.differenceInDays)(endDate, startDate) + 1; // +1 para incluir el día final
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
async function canStartNewCycle(userId) {
    // Buscar inscripción activa
    const activeEnrollment = await prisma_1.prisma.programEnrollment.findFirst({
        where: {
            usuarioId: userId,
            status: 'ACTIVE'
        },
        include: {
            Vision: {
                select: { name: true, endDate: true }
            }
        }
    });
    if (activeEnrollment) {
        return {
            canStart: false,
            reason: activeEnrollment.Vision
                ? `Ya tienes un ciclo activo en la visión "${activeEnrollment.Vision.name}" hasta ${new Date(activeEnrollment.cycleEndDate).toLocaleDateString()}`
                : `Ya tienes un ciclo personal activo hasta ${new Date(activeEnrollment.cycleEndDate).toLocaleDateString()}`,
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
async function createEnrollment(userId, cycleDates) {
    return await prisma_1.prisma.programEnrollment.create({
        data: {
            usuarioId: userId,
            cycleType: cycleDates.cycleType,
            cycleStartDate: cycleDates.startDate,
            cycleEndDate: cycleDates.endDate,
            status: 'ACTIVE',
            visionId: cycleDates.visionId
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
async function calculateRemainingDays(fromDate, userId) {
    const enrollment = await prisma_1.prisma.programEnrollment.findFirst({
        where: {
            usuarioId: userId,
            status: 'ACTIVE'
        }
    });
    if (!enrollment) {
        throw new Error(`Usuario #${userId} no tiene un ciclo activo`);
    }
    const remaining = (0, date_fns_1.differenceInDays)((0, date_fns_1.startOfDay)(new Date(enrollment.cycleEndDate)), (0, date_fns_1.startOfDay)(fromDate));
    return Math.max(0, remaining);
}
/**
 * Obtiene el último día con tareas generadas para un usuario
 * Útil para extensiones
 * @param userId - ID del usuario
 * @returns Fecha de la última tarea o null
 */
async function getLastTaskDate(userId) {
    const lastTask = await prisma_1.prisma.tarea.findFirst({
        where: { usuarioId: userId },
        orderBy: { dueDate: 'desc' },
        select: { dueDate: true }
    });
    return lastTask ? (0, date_fns_1.startOfDay)(new Date(lastTask.dueDate)) : null;
}
/**
 * Valida si una fecha de extensión es válida
 * @param currentEndDate - Fecha actual de fin
 * @param newEndDate - Nueva fecha propuesta
 * @returns Objeto con validación
 */
function validateExtensionDate(currentEndDate, newEndDate) {
    const current = (0, date_fns_1.startOfDay)(new Date(currentEndDate));
    const newDate = (0, date_fns_1.startOfDay)(new Date(newEndDate));
    if ((0, date_fns_1.isBefore)(newDate, current)) {
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
    const additionalDays = (0, date_fns_1.differenceInDays)(newDate, current);
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
async function getCycleStats(userId) {
    const enrollment = await prisma_1.prisma.programEnrollment.findFirst({
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
    const now = (0, date_fns_1.startOfDay)(new Date());
    const startDate = (0, date_fns_1.startOfDay)(new Date(enrollment.cycleStartDate));
    const endDate = (0, date_fns_1.startOfDay)(new Date(enrollment.cycleEndDate));
    const totalDays = (0, date_fns_1.differenceInDays)(endDate, startDate) + 1;
    const daysElapsed = (0, date_fns_1.differenceInDays)(now, startDate);
    const daysRemaining = (0, date_fns_1.differenceInDays)(endDate, now);
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
