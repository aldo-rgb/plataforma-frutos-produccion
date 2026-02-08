/**
 * Genera un código de referencia único para un usuario
 * Formato: [3 letras nombre][V + número visión][8 caracteres aleatorios]
 * Ejemplo: LUIV16P3D5YXY4
 * 
 * @param nombre - Nombre del usuario
 * @param visionNumber - Número de la visión (opcional)
 * @returns Código de referencia único
 */
export function generateReferralCode(nombre: string, visionNumber?: number): string {
  // Limpiar nombre y obtener primeras 3 letras
  const nombreLimpio = (nombre || 'USR').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
  
  // Identificador de visión (si se proporciona)
  const visionPart = visionNumber ? `V${visionNumber}` : '';
  
  // Generar parte aleatoria (8 caracteres alfanuméricos sin caracteres confusos)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}${visionPart}${random}`;
}

/**
 * Genera un código de referencia para Liderato (PL)
 * Formato: [3 letras nombre]L[número liderato][8 caracteres aleatorios]
 * Ejemplo: MATML16HSW2KZ27
 * 
 * @param nombre - Nombre del usuario
 * @param lideratoNumber - Número del liderato
 * @returns Código de referencia único para PL
 */
export function generatePLReferralCode(nombre: string, lideratoNumber: number): string {
  const nombreLimpio = (nombre || 'USR').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}L${lideratoNumber}${random}`;
}

/**
 * Genera un código de referencia simple sin identificador de visión
 * Formato: [3 letras nombre][timestamp base36][4 caracteres aleatorios]
 * Ejemplo: LUIMKCJPFBWZGFM
 * 
 * @param nombre - Nombre del usuario
 * @returns Código de referencia único
 */
export function generateSimpleReferralCode(nombre: string): string {
  const nombreLimpio = (nombre || 'USR').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
  
  const timestamp = Date.now().toString(36).toUpperCase();
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}${timestamp}${random}`;
}
