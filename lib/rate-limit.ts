/**
 * Rate Limiter simple para APIs
 * 
 * IMPORTANTE: Esta implementación usa memoria en proceso.
 * En Vercel con serverless functions, cada función tiene su propia memoria,
 * por lo que el rate limiting es "por instancia".
 * 
 * Para rate limiting distribuido real, usar:
 * - @upstash/ratelimit con Redis
 * - Vercel Edge Config
 * 
 * Esta implementación es útil para:
 * - Limitar abuso básico
 * - Desarrollo local
 * - Protección contra bots simples
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store en memoria (por instancia de función)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Número máximo de requests permitidos en la ventana */
  limit: number;
  /** Ventana de tiempo en segundos */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Configuraciones predefinidas para diferentes tipos de endpoints
 */
export const RateLimitPresets = {
  /** Para login/registro - muy restrictivo */
  auth: { limit: 5, windowSeconds: 60 },
  
  /** Para APIs de pago - restrictivo */
  payment: { limit: 10, windowSeconds: 60 },
  
  /** Para APIs de IA (costosas) - moderado */
  ai: { limit: 20, windowSeconds: 60 },
  
  /** Para APIs públicas sin auth - restrictivo por IP */
  public: { limit: 30, windowSeconds: 60 },
  
  /** Para APIs normales - permisivo */
  standard: { limit: 100, windowSeconds: 60 },
  
  /** Para webhooks - muy permisivo */
  webhook: { limit: 500, windowSeconds: 60 },
} as const;

/**
 * Verifica si un identificador ha excedido el rate limit
 * 
 * @param identifier - IP, userId, o cualquier string único
 * @param config - Configuración del rate limit
 * @returns Resultado con success=true si está permitido
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // Si no existe o expiró, crear nueva entrada
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + (config.windowSeconds * 1000),
    };
    rateLimitStore.set(key, entry);
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetTime,
    };
  }
  
  // Incrementar contador
  entry.count += 1;
  
  // Verificar si excede el límite
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Obtiene el identificador del cliente desde el request
 * Prioriza: x-forwarded-for > x-real-ip > connection remote
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for puede tener múltiples IPs, tomar la primera
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback a un identificador genérico
  return 'unknown-client';
}

/**
 * Helper para crear headers de rate limit en respuesta
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  return headers;
}

/**
 * Middleware helper para verificar rate limit
 * Retorna null si está permitido, o una Response si está bloqueado
 */
export function rateLimit(
  request: Request,
  config: RateLimitConfig = RateLimitPresets.standard
): { result: RateLimitResult; response?: Response } {
  const identifier = getClientIdentifier(request);
  const result = checkRateLimit(identifier, config);
  
  if (!result.success) {
    const headers = createRateLimitHeaders(result);
    headers.set('Retry-After', Math.ceil((result.reset - Date.now()) / 1000).toString());
    
    return {
      result,
      response: new Response(
        JSON.stringify({ 
          error: 'Demasiadas solicitudes. Intenta más tarde.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        }),
        { 
          status: 429,
          headers,
        }
      ),
    };
  }
  
  return { result };
}

export default rateLimit;
