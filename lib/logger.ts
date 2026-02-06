/**
 * Logger profesional para producción
 * - En desarrollo: muestra todos los logs
 * - En producción: solo muestra errores y warnings críticos
 * - Nunca expone datos sensibles
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = process.env.DEBUG_LOGS === 'true';

// Datos sensibles que nunca deben loguearse
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
];

function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Truncar strings muy largos
    if (data.length > 500) {
      return data.substring(0, 500) + '... [truncated]';
    }
    return data;
  }
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    // Limitar arrays a 10 elementos en logs
    const limited = data.slice(0, 10).map(sanitizeData);
    if (data.length > 10) {
      return [...limited, `... and ${data.length - 10} more items`];
    }
    return limited;
  }
  
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Ocultar campos sensibles
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeData(value);
    }
  }
  return sanitized;
}

function formatMessage(prefix: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  let formatted = `[${timestamp}] ${prefix} ${message}`;
  
  if (data !== undefined) {
    const sanitizedData = sanitizeData(data);
    formatted += ` ${JSON.stringify(sanitizedData)}`;
  }
  
  return formatted;
}

export const logger = {
  /**
   * Log informativo - solo en desarrollo o si DEBUG_LOGS está habilitado
   */
  info: (message: string, data?: unknown) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(formatMessage('ℹ️', message, data));
    }
  },

  /**
   * Log de debug - solo en desarrollo
   */
  debug: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(formatMessage('🔍', message, data));
    }
  },

  /**
   * Log de warning - siempre visible pero sanitizado
   */
  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage('⚠️', message, sanitizeData(data)));
  },

  /**
   * Log de error - siempre visible, incluye stack trace en desarrollo
   */
  error: (message: string, error?: unknown) => {
    let errorData: unknown;
    
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        // Solo incluir stack en desarrollo
        ...(isDevelopment && { stack: error.stack }),
      };
    } else {
      errorData = sanitizeData(error);
    }
    
    console.error(formatMessage('❌', message, errorData));
  },

  /**
   * Log de operación completada - solo en desarrollo
   */
  success: (message: string, data?: unknown) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(formatMessage('✅', message, data));
    }
  },

  /**
   * Log de inicio de operación - solo en desarrollo
   */
  start: (message: string, data?: unknown) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(formatMessage('🚀', message, data));
    }
  },

  /**
   * Log de operación de cron/background - siempre visible (para monitoreo)
   */
  cron: (message: string, data?: unknown) => {
    // Los crons siempre se loguean para monitoreo, pero sanitizados
    console.log(formatMessage('⏰ [CRON]', message, sanitizeData(data)));
  },

  /**
   * Log de auditoría - siempre se guarda (para acciones importantes)
   */
  audit: (action: string, userId: number | string, details?: unknown) => {
    const auditData: Record<string, unknown> = {
      action,
      userId,
      timestamp: new Date().toISOString(),
    };
    if (details) {
      auditData.details = sanitizeData(details);
    }
    // En producción esto debería ir a un servicio de logging externo
    console.log(formatMessage('📋 [AUDIT]', action, auditData));
  },
};

export default logger;
