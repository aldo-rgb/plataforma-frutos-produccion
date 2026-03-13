/**
 * Configuración de Visiones que auto-gradúan usuarios
 * 
 * Los usuarios que se inscriban en estas visiones serán marcados
 * automáticamente como graduados (isGraduated: true), lo que les
 * permite acceder al sistema de comisiones por referidos (Quantum Ambassadors).
 * 
 * Vision 12: "Tu Vida en Equilibrio" - Team de líderes ya graduados
 */

// IDs de visiones que auto-gradúan usuarios
export const AUTO_GRADUATE_VISION_IDS: number[] = [
  12, // Tu Vida en Equilibrio
];

/**
 * Verifica si una visión debe auto-graduar a sus participantes
 */
export function shouldAutoGraduate(visionId: number): boolean {
  return AUTO_GRADUATE_VISION_IDS.includes(visionId);
}

/**
 * Datos para marcar un usuario como graduado
 */
export function getGraduateData() {
  return {
    isGraduated: true,
  };
}
