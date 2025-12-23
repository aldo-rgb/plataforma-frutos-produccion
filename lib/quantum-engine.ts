/**
 * 🧬 QUANTUM PATTERNS ENGINE
 * Motor de Analítica Predictiva
 * Detecta correlaciones ocultas entre hábitos, horarios y estados de ánimo
 */

import { prisma } from '@/lib/prisma';
import { TimeSlot, TaskStatus, PatternType } from '@prisma/client';
import { getTimeSlotName, getDayName, getPatternEmoji } from '@/lib/quantum-helpers';

interface PatternData {
  type: PatternType;
  confidence: number;
  message: string;
  metadata: any;
}

/**
 * Analiza patrones de un usuario (últimas 4 semanas)
 * Ejecutar como Job Semanal (Domingo noche)
 */
export async function analyzeUserPatterns(usuarioId: number): Promise<PatternData[]> {
  console.log(`[QUANTUM] Analizando patrones para usuario ${usuarioId}`);

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // Obtener todas las tareas completadas y falladas de las últimas 4 semanas
  const tasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId,
      createdAt: { gte: fourWeeksAgo },
      status: { in: ['COMPLETED', 'SKIPPED'] },
    },
    include: {
      Accion: {
        select: {
          id: true,
          titulo: true,
          categoria: true,
        },
      },
    },
    orderBy: { completedAt: 'asc' },
  });

  if (tasks.length < 10) {
    console.log('[QUANTUM] Datos insuficientes para análisis');
    return [];
  }

  const patterns: PatternData[] = [];

  // 1. Detectar Golden Hour
  const goldenHour = await detectGoldenHour(usuarioId, tasks);
  if (goldenHour) patterns.push(goldenHour);

  // 2. Detectar Keystone Habit (Efecto Dominó)
  const keystoneHabit = await detectKeystoneHabit(usuarioId, tasks);
  if (keystoneHabit) patterns.push(keystoneHabit);

  // 3. Detectar Cursed Day
  const cursedDay = await detectCursedDay(usuarioId, tasks);
  if (cursedDay) patterns.push(cursedDay);

  console.log(`[QUANTUM] ${patterns.length} patrones detectados`);
  return patterns;
}

/**
 * 🌅 GOLDEN HOUR: Detecta la franja horaria con >90% de cumplimiento
 */
async function detectGoldenHour(usuarioId: number, tasks: any[]): Promise<PatternData | null> {
  const tasksWithTime = tasks.filter((t) => t.completedAt && t.timeSlot);

  if (tasksWithTime.length < 10) return null;

  // Agrupar por timeSlot
  const slotStats: Record<string, { completed: number; total: number }> = {};

  tasks.forEach((task) => {
    if (!task.timeSlot) return;

    if (!slotStats[task.timeSlot]) {
      slotStats[task.timeSlot] = { completed: 0, total: 0 };
    }

    slotStats[task.timeSlot].total++;
    if (task.status === 'COMPLETED') {
      slotStats[task.timeSlot].completed++;
    }
  });

  // Encontrar el slot con mayor % de éxito
  let bestSlot: TimeSlot | null = null;
  let bestRate = 0;

  Object.entries(slotStats).forEach(([slot, stats]) => {
    if (stats.total < 5) return; // Mínimo 5 muestras
    const rate = stats.completed / stats.total;
    if (rate > bestRate) {
      bestRate = rate;
      bestSlot = slot as TimeSlot;
    }
  });

  if (!bestSlot || bestRate < 0.9) return null;

  // Encontrar el área que más falla fuera de ese horario
  const areaFails: Record<string, number> = {};
  tasks.forEach((task) => {
    if (task.timeSlot !== bestSlot && task.status === 'SKIPPED') {
      const area = task.Accion.categoria || 'General';
      areaFails[area] = (areaFails[area] || 0) + 1;
    }
  });

  const worstArea = Object.entries(areaFails).sort((a, b) => b[1] - a[1])[0];

  const message = worstArea
    ? `Eres un guerrero ${bestSlot === 'EVENING' || bestSlot === 'NIGHT' ? 'nocturno' : 'matutino'}. Tus tareas de ${worstArea[0]} fallan fuera de este horario, pero tienes ${Math.round(bestRate * 100)}% de éxito en ${getTimeSlotName(bestSlot)}.`
    : `Tu zona de poder es ${getTimeSlotName(bestSlot)} con ${Math.round(bestRate * 100)}% de cumplimiento. Programa tus tareas más importantes en este horario.`;

  return {
    type: 'GOLDEN_HOUR',
    confidence: bestRate,
    message,
    metadata: {
      goldenTimeSlot: bestSlot,
      successRate: bestRate,
      sampleSize: slotStats[bestSlot].total,
    },
  };
}

/**
 * 🔗 KEYSTONE HABIT: Detecta si completar Tarea A aumenta probabilidad de Tarea B
 */
async function detectKeystoneHabit(usuarioId: number, tasks: any[]): Promise<PatternData | null> {
  // Agrupar tareas por fecha
  const tasksByDate: Record<string, any[]> = {};

  tasks.forEach((task) => {
    const dateKey = task.dueDate.toISOString().split('T')[0];
    if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
    tasksByDate[dateKey].push(task);
  });

  // Obtener acciones únicas
  const uniqueActions = [...new Set(tasks.map((t) => t.accionId))];

  if (uniqueActions.length < 2) return null;

  let bestCorrelation: any = null;
  let maxDiff = 0;

  // Probar todas las combinaciones de acciones
  for (const keystoneId of uniqueActions) {
    for (const affectedId of uniqueActions) {
      if (keystoneId === affectedId) continue;

      // Días con keystone completado
      const daysWithKeystone = Object.entries(tasksByDate)
        .filter(([_, dayTasks]) => dayTasks.some((t) => t.accionId === keystoneId && t.status === 'COMPLETED'))
        .map(([date]) => date);

      // Días sin keystone
      const daysWithoutKeystone = Object.entries(tasksByDate)
        .filter(([_, dayTasks]) => !dayTasks.some((t) => t.accionId === keystoneId && t.status === 'COMPLETED'))
        .map(([date]) => date);

      if (daysWithKeystone.length < 3 || daysWithoutKeystone.length < 3) continue;

      // Calcular % de cumplimiento de affected en ambos casos
      const successWithKeystone =
        daysWithKeystone.filter((date) =>
          tasksByDate[date].some((t) => t.accionId === affectedId && t.status === 'COMPLETED')
        ).length / daysWithKeystone.length;

      const successWithoutKeystone =
        daysWithoutKeystone.filter((date) =>
          tasksByDate[date].some((t) => t.accionId === affectedId && t.status === 'COMPLETED')
        ).length / daysWithoutKeystone.length;

      const diff = successWithKeystone - successWithoutKeystone;

      if (diff > maxDiff && diff > 0.2) {
        // Mínimo 20% de diferencia
        maxDiff = diff;
        const keystoneTask = tasks.find((t) => t.accionId === keystoneId);
        const affectedTask = tasks.find((t) => t.accionId === affectedId);
        bestCorrelation = {
          keystoneTitle: keystoneTask?.Accion.titulo,
          affectedTitle: affectedTask?.Accion.titulo,
          keystoneArea: keystoneTask?.Accion.categoria,
          affectedArea: affectedTask?.Accion.categoria,
          diff,
          keystoneId,
          affectedId,
        };
      }
    }
  }

  if (!bestCorrelation || maxDiff < 0.2) return null;

  const message = `Dato curioso: Los días que completas "${bestCorrelation.keystoneTitle}", tu cumplimiento en "${bestCorrelation.affectedTitle}" sube un ${Math.round(maxDiff * 100)}%. Este es tu hábito clave.`;

  return {
    type: 'KEYSTONE_HABIT',
    confidence: Math.min(maxDiff * 2, 1.0), // Normalizar
    message,
    metadata: {
      keystoneTaskId: bestCorrelation.keystoneId,
      affectedTaskId: bestCorrelation.affectedId,
      correlationDiff: maxDiff,
      sampleSize: tasks.length,
    },
  };
}

/**
 * ⚠️ CURSED DAY: Detecta el día con >60% de tasa de fallo
 */
async function detectCursedDay(usuarioId: number, tasks: any[]): Promise<PatternData | null> {
  const dayStats: Record<number, { completed: number; total: number }> = {};

  tasks.forEach((task) => {
    const day = task.dayOfWeek;
    if (day === null || day === undefined) return;

    if (!dayStats[day]) dayStats[day] = { completed: 0, total: 0 };
    dayStats[day].total++;
    if (task.status === 'COMPLETED') dayStats[day].completed++;
  });

  let cursedDay: number | null = null;
  let worstRate = 1.0;

  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.total < 4) return; // Mínimo 4 muestras
    const failRate = 1 - stats.completed / stats.total;
    if (failRate > worstRate) {
      worstRate = failRate;
      cursedDay = parseInt(day);
    }
  });

  if (cursedDay === null || worstRate < 0.6) return null;

  const message = `Los ${getDayName(cursedDay)} son tu talón de Aquiles. Tienes ${Math.round(worstRate * 100)}% de fallo. Te sugiero reducir la carga este día o programar solo tareas críticas.`;

  return {
    type: 'CURSED_DAY',
    confidence: worstRate,
    message,
    metadata: {
      cursedDay,
      failureRate: worstRate,
      sampleSize: dayStats[cursedDay].total,
    },
  };
}

/**
 * Guarda los patrones detectados en la base de datos
 */
export async function savePatterns(usuarioId: number, patterns: PatternData[]): Promise<void> {
  // Desactivar patrones antiguos
  await prisma.quantumPattern.updateMany({
    where: { usuarioId, isActive: true },
    data: { isActive: false },
  });

  for (const pattern of patterns) {
    // Crear el patrón
    const savedPattern = await prisma.quantumPattern.create({
      data: {
        usuarioId,
        patternType: pattern.type,
        confidence: pattern.confidence,
        goldenTimeSlot: pattern.metadata.goldenTimeSlot || null,
        successRate: pattern.metadata.successRate || null,
        keystoneTaskId: pattern.metadata.keystoneTaskId || null,
        affectedTaskId: pattern.metadata.affectedTaskId || null,
        correlationDiff: pattern.metadata.correlationDiff || null,
        cursedDay: pattern.metadata.cursedDay || null,
        failureRate: pattern.metadata.failureRate || null,
        sampleSize: pattern.metadata.sampleSize || 0,
        isActive: true,
      },
    });

    // Crear el Insight para mostrar al usuario
    await prisma.quantumInsight.create({
      data: {
        patternId: savedPattern.id,
        usuarioId,
        title: 'Patrón de Éxito Detectado',
        message: pattern.message,
        actionButton: 'Ajustar Agenda Inteligente',
        actionUrl: '/dashboard/agenda',
        iconEmoji: getPatternEmoji(pattern.type),
        chartData: {
          type: pattern.type,
          value: Math.round(pattern.confidence * 100),
        },
      },
    });
  }

  console.log(`[QUANTUM] ${patterns.length} patrones guardados para usuario ${usuarioId}`);
}

/**
 * Obtiene insights activos no vistos para un usuario
 */
export async function getActiveInsights(usuarioId: number) {
  return prisma.quantumInsight.findMany({
    where: {
      usuarioId,
      viewed: false,
      dismissed: false,
      Pattern: { isActive: true },
    },
    include: {
      Pattern: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3, // Máximo 3 insights a la vez
  });
}
