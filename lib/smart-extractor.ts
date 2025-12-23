/**
 * Motor de Extracción Inteligente - Coach Auto-Completado
 * Analiza objetivos y extrae información para pre-llenar el Plan de Acción
 */

export interface ExtractedInfo {
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'UNIQUE' | null;
  detectedDays?: number[]; // 0=Dom, 1=Lun, 2=Mar, etc.
  detectedDate?: string; // Fecha específica detectada
  detectedNumber?: number; // Cantidad/métrica detectada
  isSMART: {
    specific: boolean;
    measurable: boolean;
    achievable: boolean;
    relevant: boolean;
    timeBound: boolean;
  };
  confidence: number; // 0-100
  suggestion: string; // Mensaje del Coach
}

/**
 * Analiza un texto y extrae información de frecuencia, fechas y métricas
 */
export function extractSmartInfo(text: string): ExtractedInfo {
  const normalized = text.toLowerCase().trim();
  
  const result: ExtractedInfo = {
    frequency: null,
    isSMART: {
      specific: false,
      measurable: false,
      achievable: false,
      relevant: false,
      timeBound: false
    },
    confidence: 0,
    suggestion: ''
  };

  // 1. DETECCIÓN DE FECHAS ESPECÍFICAS (Prioridad 1)
  const dateDetection = detectUniqueDate(normalized);
  if (dateDetection.found) {
    result.frequency = 'UNIQUE';
    result.detectedDate = dateDetection.date;
    result.isSMART.timeBound = true;
    result.confidence = 90;
    result.suggestion = `🚀 ¡Meta con fecha de caducidad! Detecté que tienes un objetivo para el ${dateDetection.dateFormatted}. Lo he registrado como una Acción Única en tu plan de acción. ¡A darle con todo!`;
    return result;
  }

  // 2. DETECCIÓN DE FRECUENCIA DIARIA
  const dailyPatterns = [
    'todos los días', 'diariamente', 'cada día', 'diaria', 'diario',
    'cada mañana', 'todas las mañanas', 'al despertar',
    'cada noche', 'todas las noches', 'antes de dormir',
    'siempre que', 'cada jornada',
    '7 días a la semana', 'de lunes a domingo',
    'al dia', 'al día', 'por dia', 'por día', // NUEVO: variaciones comunes
    'vez al dia', 'vez al día', 'veces al dia', 'veces al día', // NUEVO: "dos veces al dia"
    'todos los dias' // NUEVO: sin acento
  ];
  
  if (dailyPatterns.some(pattern => normalized.includes(pattern))) {
    result.frequency = 'DAILY';
    result.confidence = 95;
    result.suggestion = '📢 ¡Eso es compromiso! He marcado esto como un Hábito Diario porque tu enfoque es constante. ¿Confirmamos?';
    result.isSMART.timeBound = true;
    return result;
  }

  // 3. DETECCIÓN DE FRECUENCIA SEMANAL
  const weeklyDetection = detectWeeklyPattern(normalized);
  if (weeklyDetection.found) {
    result.frequency = 'WEEKLY';
    result.detectedDays = weeklyDetection.days;
    result.confidence = 85;
    result.suggestion = '🎯 ¡Buen ritmo! Detecté que esto es un compromiso Semanal. Ya seleccioné los días por ti para ahorrarte tiempo. Revísalos abajo.';
    result.isSMART.timeBound = true;
    return result;
  }

  // 4. DETECCIÓN DE FRECUENCIA QUINCENAL
  const biweeklyPatterns = [
    'quincenal', 'quincenalmente', 'cada quincena',
    'cada dos semanas', 'cada 2 semanas',
    'dos veces al mes', '2 veces al mes',
    'los días 15 y 30', 'los días 1 y 15'
  ];
  
  if (biweeklyPatterns.some(pattern => normalized.includes(pattern))) {
    result.frequency = 'BIWEEKLY';
    result.confidence = 80;
    result.suggestion = '🗓️ Estrategia detectada: He configurado la recurrencia Quincenal basándome en tu descripción. ¡Mantengamos el orden!';
    result.isSMART.timeBound = true;
    return result;
  }

  // 5. DETECCIÓN DE FRECUENCIA MENSUAL
  const monthlyPatterns = [
    'mensual', 'mensualmente', 'cada mes', 'una vez al mes',
    'el primer día de cada mes', 'el último día del mes',
    'todos los meses', 'cada 30 días'
  ];
  
  if (monthlyPatterns.some(pattern => normalized.includes(pattern))) {
    result.frequency = 'MONTHLY';
    result.confidence = 80;
    result.suggestion = '🗓️ Estrategia detectada: He configurado la recurrencia Mensual basándome en tu descripción. ¡Mantengamos el orden!';
    result.isSMART.timeBound = true;
    return result;
  }

  // 6. VALIDACIÓN SMART (números, métricas)
  result.isSMART.measurable = detectNumbers(normalized);
  result.isSMART.specific = text.length >= 20 && text.split(' ').length >= 4;
  
  if (result.isSMART.measurable || result.isSMART.specific) {
    result.confidence = 60;
    result.suggestion = '🧠 Mente SMART: Veo que incluiste métricas y detalles. ¡Excelente redacción!';
  }

  return result;
}

/**
 * Detecta fechas específicas en el texto
 */
function detectUniqueDate(text: string): { found: boolean; date?: string; dateFormatted?: string } {
  // Meses en español
  const months = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
  };

  // Buscar patrones como "antes del 5 de enero", "para el 15 de marzo"
  const dateConnectors = ['antes del', 'para el', 'a más tardar el', 'límite el', 'fecha', 'hasta el'];
  
  for (const connector of dateConnectors) {
    if (text.includes(connector)) {
      // Buscar número + mes
      const regex = /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/;
      const match = text.match(regex);
      
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = months[match[2] as keyof typeof months];
        const year = new Date().getFullYear();
        
        return {
          found: true,
          date: `${year}-${month}-${day}`,
          dateFormatted: `${day} de ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`
        };
      }
    }
  }

  // Buscar formato DD/MM/YYYY o DD-MM-YYYY
  const numericRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?/;
  const numericMatch = text.match(numericRegex);
  
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, '0');
    const month = numericMatch[2].padStart(2, '0');
    const year = numericMatch[3] ? numericMatch[3] : new Date().getFullYear().toString();
    
    return {
      found: true,
      date: `${year}-${month}-${day}`,
      dateFormatted: `${day}/${month}/${year}`
    };
  }

  return { found: false };
}

/**
 * Detecta patrones semanales y días específicos
 */
function detectWeeklyPattern(text: string): { found: boolean; days?: number[] } {
  const days: number[] = [];
  
  // Días explícitos
  const dayMap: Record<string, number> = {
    'domingo': 0, 'dom': 0,
    'lunes': 1, 'lun': 1,
    'martes': 2, 'mar': 2,
    'miércoles': 3, 'mie': 3, 'miercoles': 3,
    'jueves': 4, 'jue': 4,
    'viernes': 5, 'vie': 5,
    'sábado': 6, 'sab': 6, 'sabado': 6
  };
  
  for (const [dayName, dayNum] of Object.entries(dayMap)) {
    if (text.includes(dayName)) {
      if (!days.includes(dayNum)) days.push(dayNum);
    }
  }
  
  // Agrupadores especiales
  if (text.includes('fines de semana') || text.includes('fin de semana')) {
    days.push(6, 0); // Sábado y Domingo
  }
  
  if (text.includes('días laborales') || text.includes('entre semana')) {
    days.push(1, 2, 3, 4, 5); // Lun a Vie
  }
  
  // Frecuencia numérica
  const weeklyPatterns = [
    'una vez por semana', '1 vez a la semana',
    'dos veces por semana', '2 veces por semana',
    'tres veces', '3 veces',
    'veces por semana', 'veces a la semana'
  ];
  
  const hasWeeklyPattern = weeklyPatterns.some(pattern => text.includes(pattern));
  
  if (days.length > 0 || hasWeeklyPattern) {
    return { found: true, days: days.length > 0 ? days.sort() : undefined };
  }
  
  return { found: false };
}

/**
 * Detecta números y métricas en el texto
 */
function detectNumbers(text: string): boolean {
  // Buscar números
  const hasNumber = /\d+/.test(text);
  
  // Buscar palabras de métricas
  const metrics = [
    'kilogramos', 'kg', 'kilos',
    'pesos', '$', 'dólares', 'euros',
    'clientes', 'ventas', 'páginas', 'horas',
    'minutos', 'días', 'semanas', 'meses',
    'metros', 'kilómetros', 'km',
    'libras', 'lb',
    '%', 'porcentaje', 'por ciento'
  ];
  
  const hasMetric = metrics.some(metric => text.includes(metric));
  
  return hasNumber && hasMetric;
}

/**
 * Genera mensaje de cierre cuando el wizard está completo
 */
export function generateClosingMessage(extractedInfos: ExtractedInfo[]): string {
  const autoFilledCount = extractedInfos.filter(info => info.confidence >= 70).length;
  
  if (autoFilledCount >= 3) {
    return '⚡ ¡Impresionante! Tu claridad al escribir nos permitió configurar gran parte de tu plan automáticamente. Estás un paso más cerca de tu futuro. ¿Listo para enviar a revisión?';
  } else if (autoFilledCount >= 1) {
    return '✨ ¡Bien hecho! He configurado algunas acciones automáticamente basándome en tu descripción. Revisa el plan de acción y ajusta si es necesario.';
  }
  
  return '📝 Revisa tu plan de acción y configura la frecuencia para cada objetivo. ¡Estás muy cerca de completar tu carta!';
}
