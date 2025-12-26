/**
 * Utilidad para calcular fechas límite inteligentes de invitados
 * según la configuración de la visión
 * 
 * REGLA: Los primeros 50% de invitados deben completarse antes de la mitad del ciclo
 */

export interface GuestDeadline {
  guestNumber: number;
  title: string;
  dueDate: Date;
  type: 'GUEST_RECRUITMENT';
  isLocked: true;
  batch: 'first' | 'second'; // Primera o segunda mitad
}

/**
 * Calcula las fechas límite para las tareas de invitados
 * @param visionStartDate - Fecha de inicio del ciclo/visión
 * @param visionEndDate - Fecha de fin del ciclo/visión
 * @param totalGuests - Número total de invitados objetivo
 * @returns Array de objetos con información de deadline para cada invitado
 */
export function calculateGuestDeadlines(
  visionStartDate: Date,
  visionEndDate: Date,
  totalGuests: number
): GuestDeadline[] {
  if (totalGuests < 1) {
    throw new Error('El número de invitados debe ser al menos 1');
  }

  if (visionStartDate >= visionEndDate) {
    throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
  }

  // Calcular el punto medio del ciclo
  const cycleStart = new Date(visionStartDate);
  const cycleEnd = new Date(visionEndDate);
  const cycleDuration = cycleEnd.getTime() - cycleStart.getTime();
  const midPoint = new Date(cycleStart.getTime() + (cycleDuration / 2));

  // Calcular cuántos invitados van en la primera mitad
  const firstBatchSize = Math.ceil(totalGuests / 2);
  const secondBatchSize = totalGuests - firstBatchSize;

  const deadlines: GuestDeadline[] = [];

  // Primera mitad de invitados: deadline = mitad del ciclo
  for (let i = 1; i <= firstBatchSize; i++) {
    deadlines.push({
      guestNumber: i,
      title: `Invitado #${i} registrado y confirmado`,
      dueDate: new Date(midPoint),
      type: 'GUEST_RECRUITMENT',
      isLocked: true,
      batch: 'first'
    });
  }

  // Segunda mitad de invitados: deadline = fin del ciclo
  for (let i = firstBatchSize + 1; i <= totalGuests; i++) {
    deadlines.push({
      guestNumber: i,
      title: `Invitado #${i} registrado y confirmado`,
      dueDate: new Date(cycleEnd),
      type: 'GUEST_RECRUITMENT',
      isLocked: true,
      batch: 'second'
    });
  }

  return deadlines;
}

/**
 * Valida si una fecha propuesta está dentro del rango permitido
 * (El usuario puede adelantar pero no retrasar)
 */
export function validateGuestDeadline(
  proposedDate: Date,
  calculatedDeadline: Date
): { valid: boolean; message?: string } {
  const proposed = new Date(proposedDate);
  const deadline = new Date(calculatedDeadline);

  if (proposed > deadline) {
    return {
      valid: false,
      message: `La fecha no puede ser posterior a ${deadline.toLocaleDateString('es-MX')}. Puedes adelantarla, pero no retrasarla.`
    };
  }

  return { valid: true };
}

/**
 * Formatea un resumen de las fechas para mostrar al usuario
 */
export function getDeadlinesSummary(deadlines: GuestDeadline[]): {
  firstBatch: { count: number; deadline: string };
  secondBatch: { count: number; deadline: string };
  total: number;
} {
  const firstBatch = deadlines.filter(d => d.batch === 'first');
  const secondBatch = deadlines.filter(d => d.batch === 'second');

  return {
    firstBatch: {
      count: firstBatch.length,
      deadline: firstBatch[0]?.dueDate.toLocaleDateString('es-MX') || 'N/A'
    },
    secondBatch: {
      count: secondBatch.length,
      deadline: secondBatch[0]?.dueDate.toLocaleDateString('es-MX') || 'N/A'
    },
    total: deadlines.length
  };
}
