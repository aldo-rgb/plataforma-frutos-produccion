/**
 * Zod Validation Schemas
 * Esquemas de validación para proteger las APIs de inputs maliciosos
 * 
 * IMPORTANTE: Estos schemas validan SOLO la estructura de datos
 * NO modifican ni eliminan datos de la base de datos
 */

import { z } from 'zod';

// ============================================
// SCHEMAS COMUNES
// ============================================

export const emailSchema = z.string().email('Email inválido').max(255);
export const passwordSchema = z.string().min(6, 'Mínimo 6 caracteres').max(100);
export const phoneSchema = z.string().max(20).optional();
export const idSchema = z.coerce.number().int().positive('ID debe ser positivo');
export const uuidSchema = z.string().uuid('UUID inválido');

// Sanitización básica - remueve caracteres peligrosos
const sanitizeString = (val: string) => val.trim().slice(0, 1000);
export const safeStringSchema = z.string().transform(sanitizeString);

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password requerido').max(100),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(), // Opcional - se asigna Quantum123 por defecto
  nombre: z.string().min(1).max(100),
  apodo: z.string().min(1).max(50).optional(),
  apellidoPaterno: z.string().min(1).max(100).optional(),
  apellidoMaterno: z.string().max(100).optional(),
  telefono: z.string().min(1).max(20),
  horarioLlamada: z.string().max(50).optional(),
  codigoReferido: z.string().max(50).optional(),
  referralCode: z.string().max(50).optional(),
  organizationCode: z.string().max(100).optional(),
  organizationId: idSchema.optional(),
  visionId: idSchema.optional(),
  profession: z.string().max(200).optional(),
  birthdate: z.string().max(20).optional(),
  children: z.union([z.string(), z.number()]).optional(), // Puede ser string o number
  goals: z.union([z.string().max(2000), z.array(z.string())]).optional(), // Puede ser string o array
  expectations: z.string().max(2000).optional(),
});

// ============================================
// CHECKOUT / PAYMENT SCHEMAS
// ============================================

export const createPaymentSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1).max(100).default(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// Schema para checkout de registro básico
export const checkoutCreatePaymentSchema = z.object({
  organizationId: idSchema,
  visionId: idSchema.optional().nullable(),
  amount: z.number().positive('Monto debe ser positivo'),
  ticketSelection: z.enum(['BASIC_ONLY', 'FULL_VISION']).optional(),
  userData: z.object({
    nombre: z.string().min(1).max(100),
    email: emailSchema,
    apodo: z.string().max(50).optional(),
    telefono: z.string().max(20).optional(),
    password: z.string().min(6).max(100).optional(),
    horarioLlamada: z.string().max(50).optional(),
    profession: z.string().max(200).optional(),
    birthdate: z.string().max(20).optional(),
    children: z.union([z.string(), z.number()]).optional(),
    goals: z.union([z.string().max(2000), z.array(z.string())]).optional(),
    expectations: z.string().max(1000).optional(),
    referralCode: z.string().max(50).optional().nullable(),
  }).passthrough(), // Permite campos adicionales del registro
  appliedCodes: z.array(z.string().max(50)).optional(),
});

export const anticipoSchema = z.object({
  productId: idSchema,
  amount: z.number().positive('Monto debe ser positivo'),
  installments: z.number().int().min(1).max(12).optional(),
});

export const webhookMetadataSchema = z.object({
  userId: z.string().optional(),
  productId: z.string().optional(),
  checkoutId: z.string().optional(),
}).passthrough(); // Permite campos adicionales del webhook

// ============================================
// USER SCHEMAS
// ============================================

export const updateUserSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellidoPaterno: z.string().min(1).max(100).optional(),
  apellidoMaterno: z.string().max(100).optional(),
  telefono: phoneSchema,
  ciudad: z.string().max(100).optional(),
  pais: z.string().max(100).optional(),
});

export const createUserSchema = z.object({
  email: emailSchema,
  nombre: z.string().min(1).max(100),
  apellidoPaterno: z.string().min(1).max(100),
  apellidoMaterno: z.string().max(100).optional(),
  telefono: phoneSchema,
  password: passwordSchema.optional(),
  rol: z.enum(['PARTICIPANTE', 'MENTOR', 'COORDINADOR', 'DIRECTOR', 'ADMIN']).optional(),
});

// ============================================
// QUANTUM / AI SCHEMAS
// ============================================

export const quantumCoachSchema = z.object({
  message: z.string().min(1, 'Mensaje requerido').max(5000, 'Mensaje muy largo'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000),
  })).max(50).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const quantumUnblockerSchema = z.object({
  action: z.enum(['start', 'continue', 'complete', 'reset']),
  blockType: z.string().max(100).optional(),
  currentStep: z.number().int().min(0).max(20).optional(),
  userInput: z.string().max(2000).optional(),
});

// ============================================
// TICKETS SCHEMAS
// ============================================

export const ticketTransferSchema = z.object({
  ticketId: idSchema,
  recipientEmail: emailSchema,
  toEmail: emailSchema.optional(), // Alias para compatibilidad
  message: z.string().max(500).optional(),
});

export const ticketDepositSchema = z.object({
  ticketId: idSchema,
  amount: z.number().positive(),
  paymentMethod: z.enum(['stripe', 'mercadopago', 'paypal', 'transfer']).optional(),
});

export const ticketCreatePaymentSchema = z.object({
  ticketId: idSchema,
  productId: idSchema.optional(),
  paymentGateway: z.enum(['stripe', 'mercadopago', 'paypal']).optional(),
});

// ============================================
// VISION / ENROLLMENT SCHEMAS
// ============================================

export const enrollmentSchema = z.object({
  visionId: idSchema,
  userId: idSchema.optional(),
  productId: idSchema.optional(),
});

export const addGamechangersSchema = z.object({
  userIds: z.array(idSchema).min(1).max(100),
});

export const assignMentorSchema = z.object({
  mentorId: idSchema,
  participantIds: z.array(idSchema).min(1).max(50),
});

// ============================================
// ADMIN SCHEMAS
// ============================================

export const codigoSchema = z.object({
  codigo: z.string().min(3).max(50),
  tipo: z.enum(['DESCUENTO', 'REFERIDO', 'DIRECTOR', 'ESPECIAL']).optional(),
  descuento: z.number().min(0).max(100).optional(),
  maxUsos: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const organizationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// CRON / AUTOMATION SCHEMAS
// ============================================

export const cronAuthSchema = z.object({
  authorization: z.string().optional(),
}).passthrough();

export const automationSendSchema = z.object({
  automationId: idSchema,
  recipientIds: z.array(idSchema).optional(),
  testMode: z.boolean().optional(),
});

// ============================================
// FILE UPLOAD SCHEMAS
// ============================================

export const uploadSchema = z.object({
  fileName: z.string().max(255),
  fileType: z.enum([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/quicktime',
  ]).optional(),
  folder: z.string().max(100).optional(),
});

// ============================================
// DISCIPLINA / STRIKES SCHEMAS
// ============================================

export const strikeSchema = z.object({
  participantId: idSchema,
  reason: z.string().min(1).max(500),
  type: z.enum(['WARNING', 'STRIKE', 'SUSPENSION']).optional(),
});

export const blockedSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  slots: z.array(z.string()).optional(),
});

// ============================================
// EXPO / VISITOR SCHEMAS
// ============================================

export const visitorRegisterSchema = z.object({
  nombre: z.string().min(1).max(100),
  email: emailSchema,
  telefono: phoneSchema,
  empresa: z.string().max(200).optional(),
  intereses: z.array(z.string()).optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Valida datos con un schema y retorna resultado tipado
 * NO modifica datos de base de datos
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; error: string; details: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: 'Datos inválidos',
    details: result.error.issues,
  };
}

/**
 * Extrae mensaje de error amigable de ZodError
 */
export function getValidationErrorMessage(issues: z.ZodIssue[]): string {
  return issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
}

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type QuantumCoachInput = z.infer<typeof quantumCoachSchema>;
export type TicketTransferInput = z.infer<typeof ticketTransferSchema>;
