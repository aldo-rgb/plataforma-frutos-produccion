import { format, toDate } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Obtiene la zona horaria del navegador del usuario
 */
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Mexico_City'; // Fallback
  }
}

/**
 * Convierte una fecha UTC a la zona horaria del usuario
 * @param utcDate - Fecha en UTC (Date object o ISO string)
 * @param userTimeZone - Zona horaria del usuario (opcional, se detecta automáticamente)
 * @returns Date en zona horaria del usuario
 */
export function utcToUserTime(
  utcDate: Date | string,
  userTimeZone?: string
): Date {
  const tz = userTimeZone || getUserTimeZone();
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return toZonedTime(date, tz);
}

/**
 * Convierte una fecha de zona horaria local a UTC
 * @param localDate - Fecha en zona horaria local
 * @param timeZone - Zona horaria de origen
 * @returns Date en UTC
 */
export function userTimeToUTC(
  localDate: Date | string,
  timeZone?: string
): Date {
  const tz = timeZone || getUserTimeZone();
  const date = typeof localDate === 'string' ? new Date(localDate) : localDate;
  return fromZonedTime(date, tz);
}

/**
 * Formatea una fecha UTC para mostrar al usuario en su zona horaria
 * @param utcDate - Fecha en UTC
 * @param formatString - Formato deseado (ver date-fns format)
 * @param userTimeZone - Zona horaria del usuario (opcional)
 * @returns String formateado
 */
export function formatUTCForUser(
  utcDate: Date | string,
  formatString: string = 'h:mm a',
  userTimeZone?: string
): string {
  const userDate = utcToUserTime(utcDate, userTimeZone);
  return format(userDate, formatString);
}

/**
 * Combina una fecha y hora en string a un Date UTC
 * Útil para cuando el usuario selecciona "2025-12-20" y "09:00"
 * @param dateString - Fecha en formato "YYYY-MM-DD"
 * @param timeString - Hora en formato "HH:mm"
 * @param timeZone - Zona horaria del usuario
 * @returns Date en UTC
 */
export function combineDateTimeToUTC(
  dateString: string,
  timeString: string,
  timeZone?: string
): Date {
  const tz = timeZone || getUserTimeZone();
  // Crear fecha local: "2025-12-20T09:00:00"
  const localDateTimeString = `${dateString}T${timeString}:00`;
  const localDate = new Date(localDateTimeString);
  
  // Convertir a UTC
  return fromZonedTime(localDate, tz);
}

/**
 * Extrae fecha y hora separados de un Date UTC para mostrar en formularios
 * @param utcDate - Fecha en UTC
 * @param userTimeZone - Zona horaria del usuario
 * @returns {date: "YYYY-MM-DD", time: "HH:mm"}
 */
export function extractDateTimeForUser(
  utcDate: Date | string,
  userTimeZone?: string
): { date: string; time: string } {
  const userDate = utcToUserTime(utcDate, userTimeZone);
  
  return {
    date: format(userDate, 'yyyy-MM-dd'),
    time: format(userDate, 'HH:mm')
  };
}

/**
 * Lista de zonas horarias comunes (para selector en configuración)
 */
export const COMMON_TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
  { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
  { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
  { value: 'America/Mazatlan', label: 'Mazatlán (GMT-7)' },
  { value: 'America/Hermosillo', label: 'Hermosillo (GMT-7)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-3)' },
  { value: 'UTC', label: 'UTC (Tiempo Universal)' },
];
