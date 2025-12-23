/**
 * Utilidades para manejo de horarios de mentorías
 */

export interface TimeSlot {
  inicio: string; // "11:00"
  fin: string;    // "12:00"
  display: string; // "11:00 - 12:00"
}

/**
 * Genera slots de 1 hora entre horarioInicio y horarioFin
 * @param horarioInicio - Hora de inicio (ej: "11:00")
 * @param horarioFin - Hora de fin (ej: "18:00")
 * @returns Array de slots de tiempo
 */
export function generarSlotsHorarios(horarioInicio: string, horarioFin: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  const [horaInicio, minInicio] = horarioInicio.split(':').map(Number);
  const [horaFin, minFin] = horarioFin.split(':').map(Number);
  
  const inicioMinutos = horaInicio * 60 + minInicio;
  const finMinutos = horaFin * 60 + minFin;
  
  // Generar slots de 1 hora (60 minutos)
  for (let minutos = inicioMinutos; minutos < finMinutos; minutos += 60) {
    const siguienteMinutos = minutos + 60;
    
    // No crear slot si se pasa del horario de fin
    if (siguienteMinutos > finMinutos) break;
    
    const horaInicioSlot = Math.floor(minutos / 60);
    const minInicioSlot = minutos % 60;
    const horaFinSlot = Math.floor(siguienteMinutos / 60);
    const minFinSlot = siguienteMinutos % 60;
    
    const inicio = `${horaInicioSlot.toString().padStart(2, '0')}:${minInicioSlot.toString().padStart(2, '0')}`;
    const fin = `${horaFinSlot.toString().padStart(2, '0')}:${minFinSlot.toString().padStart(2, '0')}`;
    
    slots.push({
      inicio,
      fin,
      display: `${inicio} - ${fin}`
    });
  }
  
  return slots;
}

/**
 * Verifica si una fecha está en los días disponibles del mentor
 * @param fecha - Fecha a verificar
 * @param diasDisponibles - Array de días disponibles (0=Domingo, 1=Lunes, etc.)
 * @returns true si el día está disponible
 */
export function esDiaDisponible(fecha: Date, diasDisponibles: number[]): boolean {
  const diaSemana = fecha.getDay();
  return diasDisponibles.includes(diaSemana);
}

/**
 * Formatea la hora de 24h a 12h AM/PM
 * @param hora24 - Hora en formato 24h (ej: "14:00")
 * @returns Hora en formato 12h (ej: "2:00 PM")
 */
export function formatearHora12(hora24: string): string {
  const [hora, minutos] = hora24.split(':').map(Number);
  const periodo = hora >= 12 ? 'PM' : 'AM';
  const hora12 = hora === 0 ? 12 : hora > 12 ? hora - 12 : hora;
  return `${hora12}:${minutos.toString().padStart(2, '0')} ${periodo}`;
}

/**
 * Obtiene el nombre del día de la semana en español
 * @param fecha - Fecha
 * @returns Nombre del día
 */
export function obtenerNombreDia(fecha: Date): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[fecha.getDay()];
}

/**
 * Política de tiempo de sesión
 */
export const POLITICA_SESION = {
  duracionTotal: 60, // minutos
  duracionSesion: 50, // minutos
  tiempoEspera: 10, // minutos
  mensaje: 'La sesión tiene una duración de 50 minutos efectivos. El mentor otorga maximo 10 minutos de demora para esperar al participante. Si llegas tarde, el tiempo se descuenta de tu sesión. Si no te presentas, la mentoría se pierde y no es reembolsable.'
};
