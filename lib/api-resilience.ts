/**
 * External API Timeouts and Retry Logic
 * 
 * Configuración de timeouts y reintentos para servicios externos
 * para mejorar la resiliencia de la aplicación.
 */

export const API_TIMEOUTS = {
  /** OpenAI - APIs de IA pueden ser lentas */
  openai: 30000, // 30 segundos
  
  /** Stripe - Pagos */
  stripe: 15000, // 15 segundos
  
  /** MercadoPago - Pagos */
  mercadopago: 15000, // 15 segundos
  
  /** PayPal - Pagos */
  paypal: 15000, // 15 segundos
  
  /** WhatsApp API */
  whatsapp: 10000, // 10 segundos
  
  /** Resend - Emails */
  resend: 10000, // 10 segundos
  
  /** Supabase Storage */
  supabase: 20000, // 20 segundos
  
  /** Default para APIs desconocidas */
  default: 10000, // 10 segundos
} as const;

export const RETRY_CONFIG = {
  /** Máximo número de reintentos */
  maxRetries: 3,
  
  /** Delay inicial en ms (se multiplica exponencialmente) */
  initialDelay: 1000,
  
  /** Factor de multiplicación para backoff exponencial */
  backoffFactor: 2,
  
  /** Máximo delay en ms */
  maxDelay: 10000,
} as const;

/**
 * Fetch con timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUTS.default, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calcula el delay para retry con backoff exponencial
 */
function calculateBackoff(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ejecuta una función con reintentos y backoff exponencial
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryOn?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    retryOn = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // No reintentar si es el último intento o si retryOn dice que no
      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }

      // Calcular delay y esperar
      const delay = calculateBackoff(attempt);
      
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Verifica si un error es de timeout
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('timeout');
  }
  return false;
}

/**
 * Verifica si un error es de red
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED')
    );
  }
  return false;
}

/**
 * Verifica si un error es retriable (timeout o red)
 */
export function isRetriableError(error: unknown): boolean {
  return isTimeoutError(error) || isNetworkError(error);
}

// Ejemplo de uso:
// 
// import { fetchWithTimeout, withRetry, API_TIMEOUTS, isRetriableError } from '@/lib/api-resilience';
// 
// const response = await withRetry(
//   () => fetchWithTimeout('https://api.openai.com/v1/chat', {
//     timeout: API_TIMEOUTS.openai,
//     method: 'POST',
//     body: JSON.stringify({ ... }),
//   }),
//   {
//     maxRetries: 3,
//     retryOn: isRetriableError,
//     onRetry: (attempt, error) => {
//       logger.warn(`Retry ${attempt} for OpenAI API:`, error);
//     },
//   }
// );
