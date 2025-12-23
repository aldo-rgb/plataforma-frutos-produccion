/**
 * SISTEMA DE RECOMPENSAS EQUILIBRADO
 * "La Ley del Esfuerzo Relativo"
 * 
 * XP (Experiencia): Define estatus y nivel visual
 * PC (Puntos Cuánticos): Moneda real del sistema
 */

// Usar TaskRarity desde el namespace correcto de Prisma
type TaskRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

// ============================================
// CONFIGURACIÓN DE NIVELES Y RANGOS
// ============================================

export interface NivelConfig {
  nivel: number;
  xpRequerido: number;
  rango: string;
  icono: string;
  descripcion: string;
}

// ============================================
// JERARQUÍA DE RECOLECTORES - THE QUANTUM ARCHIVE
// "Lo que no se captura, se desvanece"
// ============================================

export const NIVELES: NivelConfig[] = [
  { nivel: 1, xpRequerido: 0, rango: 'RASTREADOR', icono: '🔭', descripcion: 'Rastreador' },
  { nivel: 2, xpRequerido: 100, rango: 'CAPTURADOR', icono: '📸', descripcion: 'Capturador' },
  { nivel: 3, xpRequerido: 500, rango: 'CRONISTA', icono: '🗃️', descripcion: 'Cronista' },
  { nivel: 4, xpRequerido: 1500, rango: 'GUARDIAN_REALIDAD', icono: '🔮', descripcion: 'Guardián de la Realidad' },
  { nivel: 5, xpRequerido: 3000, rango: 'ARQUITECTO_TIEMPO', icono: '⏳', descripcion: 'Arquitecto del Tiempo' },
  { nivel: 6, xpRequerido: 5000, rango: 'CAZADOR_MOMENTOS', icono: '🎯', descripcion: 'Cazador de Momentos' },
  { nivel: 7, xpRequerido: 8000, rango: 'TEJEDOR_DESTINOS', icono: '🌌', descripcion: 'Tejedor de Destinos' },
  { nivel: 8, xpRequerido: 12000, rango: 'MAESTRO_REALIDADES', icono: '💎', descripcion: 'Maestro de Realidades' },
  { nivel: 9, xpRequerido: 18000, rango: 'GUARDIAN_CUANTICO', icono: '⚡', descripcion: 'Guardián Cuántico' },
  { nivel: 10, xpRequerido: 25000, rango: 'SEÑOR_ARCHIVO', icono: '👑', descripcion: 'Señor del Archivo Eterno' },
];

export function getNivelPorXP(xp: number): NivelConfig {
  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (xp >= NIVELES[i].xpRequerido) {
      return NIVELES[i];
    }
  }
  return NIVELES[0];
}

export function getProgresoNivel(xp: number): { nivelActual: NivelConfig; xpActual: number; xpParaSiguiente: number; progreso: number } {
  const nivelActual = getNivelPorXP(xp);
  const siguienteNivel = NIVELES.find(n => n.nivel === nivelActual.nivel + 1);
  
  if (!siguienteNivel) {
    return {
      nivelActual,
      xpActual: xp - nivelActual.xpRequerido,
      xpParaSiguiente: 0,
      progreso: 100
    };
  }
  
  const xpActual = xp - nivelActual.xpRequerido;
  const xpParaSiguiente = siguienteNivel.xpRequerido - nivelActual.xpRequerido;
  const progreso = Math.min(100, Math.floor((xpActual / xpParaSiguiente) * 100));
  
  return {
    nivelActual,
    xpActual,
    xpParaSiguiente,
    progreso
  };
}

// ============================================
// CONFIGURACIÓN DE RECOMPENSAS
// ============================================

export interface RecompensaConfig {
  xp: number;
  pc: number;
  razon: string;
}

// Recompensas por rareza de tarea
export const RECOMPENSAS_POR_RAREZA: Record<TaskRarity, RecompensaConfig> = {
  COMMON: {
    xp: 10,
    pc: 5,
    razon: 'Hábito diario completado'
  },
  UNCOMMON: {
    xp: 25,
    pc: 50,
    razon: 'Tarea semanal completada'
  },
  RARE: {
    xp: 50,
    pc: 100,
    razon: 'Desafío mensual superado'
  },
  EPIC: {
    xp: 100,
    pc: 300,
    razon: 'Logro épico alcanzado'
  },
  LEGENDARY: {
    xp: 200,
    pc: 500,
    razon: 'Misión legendaria completada'
  }
};

// Bonus especiales
export const BONUS_DIA_PERFECTO = {
  pc: 100,
  razon: 'Día Perfecto - 100% de tareas completadas'
};

export const BONUS_SEMANA_PERFECTA = {
  pc: 500,
  xp: 250,
  razon: 'Semana Perfecta - 7 días al 100%'
};

export const BONUS_MES_PERFECTO = {
  pc: 2500,
  xp: 1000,
  razon: 'Mes Perfecto - 30 días de disciplina'
};

// ============================================
// CÁLCULO DE RAREZA AUTOMÁTICA
// ============================================

export function calcularRarezaPorFrecuencia(frequency: string): TaskRarity {
  switch (frequency) {
    case 'DAILY':
      return 'COMMON';
    case 'WEEKLY':
      return 'UNCOMMON';
    case 'BIWEEKLY':
    case 'MONTHLY':
      return 'RARE';
    case 'ONE_TIME':
      return 'EPIC';
    default:
      return 'COMMON';
  }
}

// ============================================
// SETS Y COLECCIONES - THE QUANTUM ARCHIVE
// "Álbumes de tu transformación"
// ============================================

export interface ColeccionConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  requisito: number;
  recompensaPC: number;
  badge: string;
  tipo: 'RACHA' | 'AREA' | 'VOLUMEN' | 'NIVEL' | 'HORARIO';
  rareza?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

export const COLECCIONES: ColeccionConfig[] = [
  // SET: GUERRERO DEL ALBA (Disciplina matutina)
  {
    id: 'guerrero_alba',
    nombre: 'Guerrero del Alba',
    descripcion: 'Sube 5 evidencias de rutinas antes de las 7:00 AM consecutivas',
    icono: '🌅',
    requisito: 5,
    recompensaPC: 500,
    badge: 'sol_naciente',
    tipo: 'HORARIO',
    rareza: 'EPIC'
  },
  
  // SET: TITAN DE ACERO (Gimnasio/Ejercicio)
  {
    id: 'titan_acero',
    nombre: 'Titán de Acero',
    descripcion: 'Acumula 30 evidencias de gimnasio o ejercicio físico',
    icono: '💪',
    requisito: 30,
    recompensaPC: 800,
    badge: 'titan_acero',
    tipo: 'AREA',
    rareza: 'EPIC'
  },
  
  // SET: EL LECTOR SILENCIOSO
  {
    id: 'lector_silencioso',
    nombre: 'El Lector Silencioso',
    descripcion: 'Completa 10 evidencias de lectura o estudio',
    icono: '📚',
    requisito: 10,
    recompensaPC: 400,
    badge: 'lector_silencioso',
    tipo: 'AREA',
    rareza: 'RARE'
  },
  
  // SET: SEMANA PERFECTA (7 días 100%)
  {
    id: 'semana_perfecta',
    nombre: 'Semana Perfecta',
    descripcion: '7 días perfectos consecutivos (100% tareas)',
    icono: '🔥',
    requisito: 7,
    recompensaPC: 1000,
    badge: 'semana_perfecta',
    tipo: 'RACHA',
    rareza: 'EPIC'
  },
  
  // SET: EL CURADOR (100 evidencias)
  {
    id: 'el_curador',
    nombre: 'El Curador',
    descripcion: '100 Artefactos de Verdad recolectados',
    icono: '🎨',
    requisito: 100,
    recompensaPC: 1500,
    badge: 'curador_maestro',
    tipo: 'VOLUMEN',
    rareza: 'LEGENDARY'
  },
  
  // SET: RACHA DE HIERRO (30 días)
  {
    id: 'racha_hierro',
    nombre: 'Racha de Hierro',
    descripcion: '30 días de racha sin romper',
    icono: '⛓️',
    requisito: 30,
    recompensaPC: 2000,
    badge: 'racha_hierro',
    tipo: 'RACHA',
    rareza: 'LEGENDARY'
  },
  
  // SET: GUARDIÁN SUPREMO (Nivel 10)
  {
    id: 'guardian_supremo',
    nombre: 'Guardián Supremo',
    descripcion: 'Alcanza el nivel 10: Señor del Archivo Eterno',
    icono: '👑',
    requisito: 10,
    recompensaPC: 3000,
    badge: 'guardian_supremo',
    tipo: 'NIVEL',
    rareza: 'LEGENDARY'
  }
];

// ============================================
// MENSAJES MOTIVACIONALES - THE QUANTUM ARCHIVE
// "Artefactos de Verdad capturados"
// ============================================

export function getMensajeMotivacional(rarity: TaskRarity, nombre: string): string {
  const mensajes: Record<TaskRarity, string[]> = {
    COMMON: [
      `${nombre}, un Artefacto Común ha sido guardado en Tu Bóveda. Lo que no se captura, se desvanece.`,
      `Captura rutinaria registrada, ${nombre}. Cada momento cuenta. +10 XP`,
      `${nombre}, estás documentando tu realidad paso a paso. Continúa.`
    ],
    UNCOMMON: [
      `¡${nombre}! Has capturado un MOMENTO POCO COMÚN. La realidad se vuelve más nítida. 🌟 +25 XP`,
      `${nombre}, este fragmento de disciplina tiene un brillo especial. Guardado en el Archivo.`,
      `Captura RARA detectada. ${nombre}, tu consistencia está generando poder.`
    ],
    RARE: [
      `💎 ${nombre}, este es un ARTEFACTO RARO. Tu esfuerzo físico deja huella. +50 XP`,
      `${nombre}, has traído al mundo una verdad excepcional. El Archivo la reconoce.`,
      `¡Momento de ALTA CALIDAD! ${nombre}, eres un Cronista en ascenso.`
    ],
    EPIC: [
      `🔥 ¡ARTEFACTO ÉPICO CAPTURADO! ${nombre}, esto es digno de un Guardián de la Realidad. +100 XP`,
      `${nombre}, acabas de escribir una página ÉPICA en el Archivo Cuántico.`,
      `¡EXCELENTE! ${nombre}, tu mentor verá este logro mayor. Historia en formación.`
    ],
    LEGENDARY: [
      `✨ ¡ARTEFACTO LEGENDARIO ADQUIRIDO! ${nombre}, has alcanzado la cima de lo posible. +200 XP`,
      `${nombre}, esta captura es DIGNA DE UN CRONISTA MAESTRO. ¡El Archivo Eterno la preserva!`,
      `👑 ${nombre}, la realidad misma se inclina ante este momento. LEGENDARY STATUS.`
    ]
  };
  
  const opciones = mensajes[rarity];
  return opciones[Math.floor(Math.random() * opciones.length)];
}
