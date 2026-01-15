import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte una fecha string a ISO string de forma segura, evitando problemas de timezone.
 * Cuando se usa solo fecha (YYYY-MM-DD), JavaScript interpreta como medianoche UTC,
 * lo cual puede resultar en el día anterior en zonas horarias negativas (ej: México UTC-6).
 * 
 * Esta función agrega T12:00:00 (mediodía) para evitar este problema.
 * 
 * @param dateStr - String de fecha en formato YYYY-MM-DD o YYYY-MM-DDTHH:MM
 * @returns ISO string o null si la entrada es vacía/nula
 */
export function toSafeISODate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  // Si ya tiene hora (datetime-local), usarlo directamente
  if (dateStr.includes('T')) {
    return new Date(dateStr).toISOString();
  }
  // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de timezone
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

/**
 * Formatea una fecha ISO a formato YYYY-MM-DD para inputs de tipo date
 * @param isoString - String ISO de fecha
 * @returns String en formato YYYY-MM-DD o string vacío
 */
export function formatDateForInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

/**
 * Formatea una fecha ISO a formato YYYY-MM-DDTHH:MM para inputs de tipo datetime-local
 * @param isoString - String ISO de fecha
 * @returns String en formato YYYY-MM-DDTHH:MM o string vacío
 */
export function formatDateTimeForInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toISOString().slice(0, 16);
}
