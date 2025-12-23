/**
 * REGLAS DE VALIDACIÓN DURAS - CARTA F.R.U.T.O.S.
 * 
 * Este archivo contiene las reglas de negocio que deben aplicarse
 * tanto en Frontend (para UX) como en Backend (para seguridad).
 * 
 * Última actualización: 18 de diciembre de 2025
 */

// ==================== CONSTANTES ====================

export const AREAS_OBLIGATORIAS = [
  'FINANZAS',
  'RELACIONES', 
  'SALUD',
  'TALENTOS',
  'PAZ_MENTAL',
  'DIVERSION',
  'COMUNIDAD',
  'ENROLAMIENTO'
] as const;

export const FRECUENCIAS_VALIDAS = [
  'DAILY',      // 7 días/semana
  'WEEKLY',     // Días específicos
  'BIWEEKLY',   // Cada 2 semanas
  'MONTHLY',    // Mensual
  'ONE_TIME'    // Una sola vez
] as const;

// ==================== VALIDADORES ====================

/**
 * Regla 1: Validar "Yo Soy" + Contenido
 * Toda declaración de identidad DEBE iniciar con "Yo soy" o "Soy" 
 * Y debe tener al menos UNA PALABRA MÁS después (no solo "yo soy" o "soy")
 */
export function validateYoSoy(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const normalized = text.trim().toLowerCase();
  
  // Verificar que empiece con "yo soy" o "soy"
  if (!normalized.startsWith('yo soy') && !normalized.startsWith('soy')) {
    return false;
  }
  
  // Extraer el contenido después de "yo soy" o "soy"
  let content = '';
  if (normalized.startsWith('yo soy')) {
    content = normalized.substring(6).trim(); // "yo soy" = 6 caracteres
  } else if (normalized.startsWith('soy')) {
    content = normalized.substring(3).trim(); // "soy" = 3 caracteres
  }
  
  // Debe haber al menos una palabra más (mínimo 3 caracteres)
  return content.length >= 3;
}

/**
 * Regla 2: Validar integridad de áreas
 * El objeto JSON debe contener las 8 llaves obligatorias
 */
export function validateAreasIntegrity(carta: any): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const area of AREAS_OBLIGATORIAS) {
    const areaKey = area.toLowerCase().replace('_', '');
    const identityKey = `${areaKey}Declaracion`;
    
    if (!carta[identityKey]) {
      missing.push(area);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Regla 3: Validar declaraciones de identidad completas
 * Todas las áreas deben tener declaración Y debe iniciar con "Yo soy"
 */
export function validateAllIdentities(carta: any): { 
  valid: boolean; 
  errors: Array<{ area: string; message: string }> 
} {
  const errors: Array<{ area: string; message: string }> = [];
  
  const areaMapping: Record<string, string> = {
    'FINANZAS': 'finanzas',
    'RELACIONES': 'relaciones',
    'SALUD': 'salud',
    'TALENTOS': 'talentos',
    'PAZ_MENTAL': 'pazMental',
    'DIVERSION': 'ocio',
    'COMUNIDAD': 'servicioComun',
    'ENROLAMIENTO': 'servicioTrans'
  };
  
  for (const area of AREAS_OBLIGATORIAS) {
    const areaKey = areaMapping[area];
    const identityKey = `${areaKey}Declaracion`;
    const declaration = carta[identityKey];
    
    if (!declaration || !declaration.trim()) {
      errors.push({
        area,
        message: 'Declaración vacía'
      });
    } else if (!validateYoSoy(declaration)) {
      errors.push({
        area,
        message: 'Debe iniciar con "Yo soy" o "Soy"'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * ========== LOS 3 PILARES DE LA MÉTRICA CUÁNTICA ==========
 * A. Pilar de Acción: Verbos de poder, no lenguaje de víctima
 * B. Pilar de Medición: Números, datos duros, evidencia
 * C. Pilar de Especificidad: Longitud mínima 15 caracteres
 */

// Palabras prohibidas (lenguaje de especifico)
const PALABRAS_VICTIMA = [
  'tratar', 'intentar', 'desear', 'esperar', 'buscar', 'querer',
  'creo', 'gustaria', 'gustaría', 'quisiera', 'ver si', 'ojala', 'ojalá',
  'tal vez', 'quizas', 'quizás', 'posiblemente', 'probablemente'
];

/**
 * PILAR A: Detector de Lenguaje de especifico
 */
function detectVictimLanguage(text: string): { found: boolean; word?: string } {
  const lowerText = text.toLowerCase();
  const foundWord = PALABRAS_VICTIMA.find(word => lowerText.includes(word));
  return {
    found: !!foundWord,
    word: foundWord
  };
}

/**
 * PILAR B: Detector de Medición (números o símbolos de moneda)
 */
function hasMeasurement(text: string): boolean {
  // Buscar dígitos o símbolos de moneda/porcentaje
  return /\d/.test(text) || /[$%€£¥₹]/.test(text);
}

/**
 * PILAR C: Validar Especificidad (longitud mínima)
 */
function hasSpecificity(text: string, minLength: number = 15): boolean {
  return text.trim().length >= minLength;
}

/**
 * VALIDADOR MAESTRO DE META S.M.A.R.T.
 * Aplica los 3 pilares cuánticos
 */
export function validateMetaSMART(text: string): {
  valid: boolean;
  error?: string;
  suggestion?: string;
} {
  if (!text || !text.trim()) {
    return {
      valid: false,
      error: 'Meta vacía',
      suggestion: 'Escribe una meta específica y medible'
    };
  }

  const trimmedText = text.trim();

  // PILAR A: Detectar lenguaje de especifico (ERROR MÁS GRAVE)
  const victimCheck = detectVictimLanguage(trimmedText);
  if (victimCheck.found) {
    return {
      valid: false,
      error: '🚫 LENGUAJE DÉBIL DETECTADO',
      suggestion: `Estás usando la palabra "${victimCheck.word}". En este entrenamiento no 'tratamos', lo HACEMOS. Cambia tu declaración a una acción afirmativa (ej: 'Voy a...', 'Generaré...', 'Lograré...').`
    };
  }

  // PILAR B: Validar medición
  if (!hasMeasurement(trimmedText)) {
    return {
      valid: false,
      error: '📊 FALTA MEDICIÓN CUANTIFICABLE',
      suggestion: 'Tu meta es una buena intención, pero no es medible. ¿Cuánto? ¿Cuántos? ¿Qué porcentaje? Sin un número, no hay evidencia de éxito. (Ej: "Vender $10,000", "Bajar 5kg", "Leer 12 libros").'
    };
  }

  // PILAR C: Validar especificidad
  if (!hasSpecificity(trimmedText, 15)) {
    return {
      valid: false,
      error: '🎯 DEMASIADO AMBIGUO',
      suggestion: 'Sé específico. "Ahorrar mucho" no sirve. Define el QUÉ, el CUÁNTO y el PARA QUÉ en una frase completa (mínimo 15 caracteres).'
    };
  }

  // ✅ TODO OK
  return { valid: true };
}

/**
 * Regla 4: Validar metas SMART con los 3 pilares cuánticos
 * Todas las áreas deben tener al menos una meta válida
 */
export function validateAllMetas(carta: any): { 
  valid: boolean; 
  missing: string[];
  errors: Array<{ area: string; error: string; suggestion: string }>
} {
  const missing: string[] = [];
  const errors: Array<{ area: string; error: string; suggestion: string }> = [];
  
  const areaMapping: Record<string, string> = {
    'FINANZAS': 'finanzas',
    'RELACIONES': 'relaciones',
    'SALUD': 'salud',
    'TALENTOS': 'talentos',
    'PAZ_MENTAL': 'pazMental',
    'DIVERSION': 'ocio',
    'COMUNIDAD': 'servicioComun',
    'ENROLAMIENTO': 'servicioTrans'
  };
  
  for (const area of AREAS_OBLIGATORIAS) {
    const areaKey = areaMapping[area];
    const metaKey = `${areaKey}Meta`;
    const meta = carta[metaKey];
    
    if (!meta || !meta.trim()) {
      missing.push(area);
    } else {
      // Validar con los 3 pilares cuánticos
      const validation = validateMetaSMART(meta);
      if (!validation.valid) {
        errors.push({
          area,
          error: validation.error || 'Error desconocido',
          suggestion: validation.suggestion || ''
        });
      }
    }
  }
  
  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };
}

/**
 * Regla 5: Validar configuración de acciones
 * Cada meta debe tener al menos 1 acción con frecuencia válida
 */
export function validateAcciones(metas: any[]): {
  valid: boolean;
  errors: Array<{ metaId: number; message: string }>;
} {
  const errors: Array<{ metaId: number; message: string }> = [];
  
  if (!metas || metas.length === 0) {
    return {
      valid: false,
      errors: [{ metaId: 0, message: 'No hay metas definidas' }]
    };
  }
  
  for (const meta of metas) {
    // Verificar que tenga acciones
    if (!meta.Accion || meta.Accion.length === 0) {
      errors.push({
        metaId: meta.id,
        message: 'Meta sin acciones asociadas'
      });
      continue;
    }
    
    // Validar cada acción
    for (const accion of meta.Accion) {
      // Validar frecuencia
      if (!accion.frequency || !FRECUENCIAS_VALIDAS.includes(accion.frequency)) {
        errors.push({
          metaId: meta.id,
          message: `Frecuencia inválida: ${accion.frequency || 'vacía'}`
        });
      }
      
      // Validaciones específicas por frecuencia
      if (accion.frequency === 'WEEKLY') {
        if (!accion.assignedDays || accion.assignedDays.length === 0) {
          errors.push({
            metaId: meta.id,
            message: 'Frecuencia SEMANAL requiere días seleccionados'
          });
        }
      }
      
      if (accion.frequency === 'MONTHLY') {
        if (!accion.assignedDays || accion.assignedDays.length === 0) {
          errors.push({
            metaId: meta.id,
            message: 'Frecuencia MENSUAL requiere día del mes'
          });
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * VALIDADOR MAESTRO
 * Ejecuta todas las validaciones en orden jerárquico
 * ACTUALIZADO: Soporta nuevo sistema con múltiples metas en tabla Meta
 */
export function validateCartaCompleta(carta: any, metas: any[]): {
  valid: boolean;
  step: number; // Qué paso falló (1, 2 o 3)
  errors: string[];
} {
  const errors: string[] = [];
  
  // Si hay metas en la tabla Meta, usar nuevo sistema de validación
  if (metas && metas.length > 0) {
    console.log('🔍 Validando carta con nuevo sistema (Meta[]):', metas.length, 'metas');
    
    // PASO 2: Validar que haya al menos 1 meta
    if (metas.length === 0) {
      return {
        valid: false,
        step: 2,
        errors: ['No hay metas configuradas. Completa el wizard antes de enviar.']
      };
    }
    
    // PASO 3: Validar que cada meta tenga al menos 1 acción
    const metasSinAcciones = metas.filter(m => !m.Accion || m.Accion.length === 0);
    if (metasSinAcciones.length > 0) {
      return {
        valid: false,
        step: 3,
        errors: [`${metasSinAcciones.length} meta(s) sin acciones configuradas`]
      };
    }
    
    // PASO 3: Validar frecuencias de acciones
    const accionesCheck = validateAcciones(metas);
    if (!accionesCheck.valid) {
      return {
        valid: false,
        step: 3,
        errors: accionesCheck.errors.map(e => `Meta ${e.metaId}: ${e.message}`)
      };
    }
    
    // ✅ TODO OK (sistema nuevo)
    console.log('✅ Validación exitosa (nuevo sistema)');
    return {
      valid: true,
      step: 3,
      errors: []
    };
  }
  
  // Sistema antiguo (CartaFrutos con campos *Declaracion y *Meta)
  console.log('🔍 Validando carta con sistema antiguo (campos en CartaFrutos)');
  
  // PASO 1: Validar integridad de áreas
  const integrityCheck = validateAreasIntegrity(carta);
  if (!integrityCheck.valid) {
    return {
      valid: false,
      step: 1,
      errors: [`Áreas faltantes: ${integrityCheck.missing.join(', ')}`]
    };
  }
  
  // PASO 1: Validar declaraciones de identidad
  const identitiesCheck = validateAllIdentities(carta);
  if (!identitiesCheck.valid) {
    return {
      valid: false,
      step: 1,
      errors: identitiesCheck.errors.map(e => `${e.area}: ${e.message}`)
    };
  }
  
  // PASO 2: Validar metas con los 3 pilares cuánticos
  const metasCheck = validateAllMetas(carta);
  if (!metasCheck.valid) {
    const errorMessages: string[] = [];
    
    if (metasCheck.missing.length > 0) {
      errorMessages.push(`Metas faltantes en: ${metasCheck.missing.join(', ')}`);
    }
    
    if (metasCheck.errors.length > 0) {
      metasCheck.errors.forEach(e => {
        errorMessages.push(`${e.area}: ${e.error} - ${e.suggestion}`);
      });
    }
    
    return {
      valid: false,
      step: 2,
      errors: errorMessages
    };
  }
  
  // ✅ TODO OK (sistema antiguo)
  return {
    valid: true,
    step: 3,
    errors: []
  };
}

/**
 * VALIDADOR PARA BACKEND (API Routes)
 * Versión estricta que lanza excepciones
 */
export function validateCartaForSubmission(carta: any, metas: any[]): void {
  const result = validateCartaCompleta(carta, metas);
  
  if (!result.valid) {
    throw new Error(
      `Validación fallida en Paso ${result.step}: ${result.errors.join('; ')}`
    );
  }
}

// ==================== HELPERS ====================

/**
 * Obtener nombre legible de área
 */
export function getAreaDisplayName(areaKey: string): string {
  const mapping: Record<string, string> = {
    'finanzas': 'FINANZAS',
    'relaciones': 'RELACIONES',
    'salud': 'SALUD',
    'talentos': 'TALENTOS',
    'pazMental': 'PAZ MENTAL',
    'ocio': 'DIVERSIÓN',
    'servicioComun': 'COMUNIDAD',
    'servicioTrans': 'ENROLAMIENTO'
  };
  
  return mapping[areaKey] || areaKey.toUpperCase();
}

/**
 * Calcular porcentaje de completitud
 */
export function calcularCompletitud(carta: any, metas: any[]): number {
  let puntos = 0;
  const totalPuntos = 24; // 8 identidades + 8 metas + 8 acciones
  
  // Identidades (8 puntos)
  const identitiesCheck = validateAllIdentities(carta);
  puntos += 8 - identitiesCheck.errors.length;
  
  // Metas (8 puntos)
  const metasCheck = validateAllMetas(carta);
  puntos += 8 - metasCheck.missing.length;
  
  // Acciones (8 puntos - simplificado)
  if (metas && metas.length > 0) {
    const accionesCheck = validateAcciones(metas);
    if (accionesCheck.valid) {
      puntos += 8;
    }
  }
  
  return Math.round((puntos / totalPuntos) * 100);
}
