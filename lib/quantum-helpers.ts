/**
 * 🧬 QUANTUM PATTERNS - Funciones Helper
 * Utilidades para análisis de patrones de comportamiento
 */

import { TimeSlot } from '@prisma/client';

/**
 * Determina la franja horaria basada en la hora (0-23)
 */
export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 9) return 'EARLY_MORNING';
  if (hour >= 9 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 15) return 'MIDDAY';
  if (hour >= 15 && hour < 18) return 'AFTERNOON';
  if (hour >= 18 && hour < 21) return 'EVENING';
  if (hour >= 21 && hour < 24) return 'NIGHT';
  return 'LATE_NIGHT'; // 0-4:59
}

/**
 * Calcula velocidad de completación (minutos early/late)
 */
export function calculateCompletionSpeed(
  scheduledTime: Date,
  completedTime: Date
): number {
  const diffMs = completedTime.getTime() - scheduledTime.getTime();
  return Math.round(diffMs / (1000 * 60)); // minutos
}

/**
 * Obtiene el día de la semana (0=Domingo, 6=Sábado)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Traduce TimeSlot a nombre legible en español
 */
export function getTimeSlotName(slot: TimeSlot): string {
  const names: Record<TimeSlot, string> = {
    EARLY_MORNING: 'Madrugada (5-9 AM)',
    MORNING: 'Mañana (9-12 PM)',
    MIDDAY: 'Mediodía (12-3 PM)',
    AFTERNOON: 'Tarde (3-6 PM)',
    EVENING: 'Noche (6-9 PM)',
    NIGHT: 'Noche tardía (9-12 AM)',
    LATE_NIGHT: 'Trasnoche (12-5 AM)',
  };
  return names[slot];
}

/**
 * Traduce día de la semana a nombre en español
 */
export function getDayName(dayIndex: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayIndex] || 'Desconocido';
}

/**
 * Genera el emoji según el tipo de patrón
 */
export function getPatternEmoji(patternType: string): string {
  const emojis: Record<string, string> = {
    GOLDEN_HOUR: '🌅',
    KEYSTONE_HABIT: '🔗',
    CURSED_DAY: '⚠️',
    STREAK_BOOSTER: '🔥',
    ENERGY_PATTERN: '⚡',
  };
  return emojis[patternType] || '🧬';
}
