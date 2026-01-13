import { prisma } from '@/lib/prisma';

/**
 * Configuración por defecto de disponibilidad para Game Changers
 * Lunes a Jueves (1-4), 6:00 AM - 8:00 AM, slots de 10 minutos
 */
export const DEFAULT_GC_AVAILABILITY = {
  days: [1, 2, 3, 4], // Lunes, Martes, Miércoles, Jueves
  startTime: '06:00',
  endTime: '08:00',
  slotDuration: 10,
};

/**
 * Crea la disponibilidad por defecto para un Game Changer si no tiene ninguna configurada
 * @param gameChangerId - ID del Game Changer
 * @returns true si se creó la disponibilidad, false si ya existía
 */
export async function ensureDefaultAvailability(gameChangerId: number): Promise<boolean> {
  // Verificar si ya tiene disponibilidad configurada
  const existingAvailability = await prisma.gCAvailability.findFirst({
    where: {
      gameChangerId,
      isActive: true,
    },
  });

  // Si ya tiene disponibilidad, no crear defaults
  if (existingAvailability) {
    return false;
  }

  // Crear disponibilidad por defecto para Lunes a Jueves (6-8 AM)
  const availabilityData = DEFAULT_GC_AVAILABILITY.days.map(dayOfWeek => ({
    gameChangerId,
    dayOfWeek,
    startTime: DEFAULT_GC_AVAILABILITY.startTime,
    endTime: DEFAULT_GC_AVAILABILITY.endTime,
    slotDuration: DEFAULT_GC_AVAILABILITY.slotDuration,
    isActive: true,
  }));

  await prisma.gCAvailability.createMany({
    data: availabilityData,
  });

  console.log(`✅ Disponibilidad por defecto creada para GC ${gameChangerId}: Lun-Jue 6-8 AM`);
  return true;
}

/**
 * Obtiene la disponibilidad de un GC, creando la por defecto si no existe
 * @param gameChangerId - ID del Game Changer
 * @returns Lista de disponibilidades
 */
export async function getOrCreateAvailability(gameChangerId: number) {
  // Primero asegurar que tenga disponibilidad
  await ensureDefaultAvailability(gameChangerId);

  // Luego obtener todas las disponibilidades activas
  return prisma.gCAvailability.findMany({
    where: {
      gameChangerId,
      isActive: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}
