import { prisma } from '@/lib/prisma';

/**
 * Configuración por defecto de disponibilidad para Game Changers
 * Lunes a Domingo (0-6), 4:00 AM - 10:00 PM, slots de 10 minutos
 * TODOS los GC tienen esta disponibilidad automáticamente
 */
export const DEFAULT_GC_AVAILABILITY = {
  days: [0, 1, 2, 3, 4, 5, 6], // Domingo a Sábado (toda la semana)
  startTime: '04:00',
  endTime: '22:00', // 10 PM
  slotDuration: 10,
};

/**
 * Verifica disponibilidad del GC (ahora todos tienen disponibilidad automática)
 * @param gameChangerId - ID del Game Changer
 * @returns true siempre - todos los GC tienen disponibilidad automática
 */
export async function ensureDefaultAvailability(gameChangerId: number): Promise<boolean> {
  // Ya no se requiere crear disponibilidad manualmente
  // Todos los GC tienen disponibilidad automática de 4am a 10pm, Lunes a Domingo
  console.log(`✅ GC ${gameChangerId} tiene disponibilidad automática: Lun-Dom 4am-10pm`);
  return true;
}

/**
 * Obtiene la disponibilidad de un GC (ahora es automática para todos)
 * @param gameChangerId - ID del Game Changer
 * @returns Configuración de disponibilidad automática
 */
export async function getOrCreateAvailability(gameChangerId: number) {
  // Retornar configuración automática - no depende de registros en BD
  const availabilities = DEFAULT_GC_AVAILABILITY.days.map(dayOfWeek => ({
    id: `auto-${gameChangerId}-${dayOfWeek}`,
    gameChangerId,
    dayOfWeek,
    startTime: DEFAULT_GC_AVAILABILITY.startTime,
    endTime: DEFAULT_GC_AVAILABILITY.endTime,
    slotDuration: DEFAULT_GC_AVAILABILITY.slotDuration,
    isActive: true,
  }));
  
  return availabilities;
}
