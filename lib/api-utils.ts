/**
 * Utilidades para manejo seguro de errores en APIs
 * - Nunca expone detalles de error al cliente en producción
 * - Mantiene logs detallados en el servidor
 */

import { NextResponse } from 'next/server';
import logger from './logger';

const isDevelopment = process.env.NODE_ENV === 'development';

// Mapeo de errores conocidos a mensajes amigables
const ERROR_MESSAGES: Record<string, string> = {
  'UNAUTHORIZED': 'No autorizado',
  'FORBIDDEN': 'Acceso denegado',
  'NOT_FOUND': 'Recurso no encontrado',
  'VALIDATION_ERROR': 'Datos inválidos',
  'DUPLICATE_ENTRY': 'El registro ya existe',
  'DATABASE_ERROR': 'Error al procesar la solicitud',
  'EXTERNAL_SERVICE_ERROR': 'Servicio externo no disponible',
  'RATE_LIMIT': 'Demasiadas solicitudes. Intenta más tarde.',
  'INTERNAL_ERROR': 'Error interno del servidor',
};

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Crea una respuesta de error segura para APIs
 */
export function createErrorResponse(
  code: keyof typeof ERROR_MESSAGES | string,
  status: number,
  logMessage?: string,
  logData?: unknown
): NextResponse {
  // Siempre loguear el error completo en el servidor
  if (logMessage) {
    logger.error(logMessage, logData);
  }

  // Mensaje para el cliente - nunca exponer detalles internos
  const clientMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES['INTERNAL_ERROR'];

  const responseBody: Record<string, unknown> = { 
    error: clientMessage,
    code,
  };
  
  if (isDevelopment && logData) {
    responseBody._debug = logData;
  }

  return NextResponse.json(responseBody, { status });
}

/**
 * Wrapper para manejar errores en API routes
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse {
  const contextPrefix = context ? `[${context}] ` : '';
  
  // Errores de Prisma
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message: string; meta?: unknown };
    
    switch (prismaError.code) {
      case 'P2002': // Unique constraint
        return createErrorResponse(
          'DUPLICATE_ENTRY',
          409,
          `${contextPrefix}Duplicate entry`,
          { code: prismaError.code, meta: prismaError.meta }
        );
      case 'P2025': // Record not found
        return createErrorResponse(
          'NOT_FOUND',
          404,
          `${contextPrefix}Record not found`,
          { code: prismaError.code }
        );
      default:
        return createErrorResponse(
          'DATABASE_ERROR',
          500,
          `${contextPrefix}Database error`,
          { code: prismaError.code, message: prismaError.message }
        );
    }
  }

  // Error estándar de JavaScript
  if (error instanceof Error) {
    return createErrorResponse(
      'INTERNAL_ERROR',
      500,
      `${contextPrefix}${error.message}`,
      { name: error.name, stack: error.stack }
    );
  }

  // Error desconocido
  return createErrorResponse(
    'INTERNAL_ERROR',
    500,
    `${contextPrefix}Unknown error`,
    error
  );
}

/**
 * Respuestas de éxito estandarizadas
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201);
}

/**
 * Respuestas de error comunes pre-construidas
 */
export const ApiErrors = {
  unauthorized: () => createErrorResponse('UNAUTHORIZED', 401, 'Unauthorized access attempt'),
  forbidden: () => createErrorResponse('FORBIDDEN', 403, 'Forbidden access attempt'),
  notFound: (resource?: string) => createErrorResponse(
    'NOT_FOUND', 
    404, 
    `Resource not found: ${resource || 'unknown'}`
  ),
  validationError: (details?: string) => createErrorResponse(
    'VALIDATION_ERROR',
    400,
    `Validation error: ${details || 'invalid data'}`
  ),
  rateLimit: () => createErrorResponse('RATE_LIMIT', 429, 'Rate limit exceeded'),
};
