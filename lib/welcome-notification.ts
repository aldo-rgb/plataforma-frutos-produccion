/**
 * Welcome Notification Service
 * Envía credenciales de bienvenida por Email y WhatsApp cuando un usuario
 * completa exitosamente cualquier flujo de pago
 */

import { sendWelcomeCredentialsEmail, sendCorporateWelcomeEmail } from '@/lib/email';
import { sendWelcomeWithAutoLoginButton } from '@/lib/whatsapp';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

interface WelcomeNotificationData {
  userId?: number; // ID del usuario para generar token de auto-login
  email: string;
  telefono: string;
  nombre: string;
  password: string; // Contraseña en texto plano (Quantum123 por defecto)
  organizationName: string;
  visionName?: string;
  loginUrl?: string;
  // Datos del ticket para email corporativo
  ticket?: {
    id: string;
    level: 'BÁSICO' | 'AVANZADO' | 'PL';
    visionDate?: string;
  };
}

interface NotificationResult {
  emailSent: boolean;
  whatsappSent: boolean;
  emailError?: string;
  whatsappError?: string;
  autoLoginUrl?: string;
}

/**
 * Genera un token de auto-login para el usuario
 */
async function generateAutoLoginToken(userId: number): Promise<string | null> {
  try {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    await prisma.autoLoginToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });

    return token;
  } catch (error) {
    console.error('Error generating auto-login token:', error);
    return null;
  }
}

/**
 * Envía notificaciones de bienvenida con credenciales por Email y WhatsApp con botón
 * Esta función debe llamarse después de crear exitosamente un usuario en cualquier flujo de pago
 */
export async function sendWelcomeNotifications(
  data: WelcomeNotificationData
): Promise<NotificationResult> {
  const result: NotificationResult = {
    emailSent: false,
    whatsappSent: false
  };

  console.log(`📬 Enviando notificaciones de bienvenida a ${data.email}...`);

  // Generar token de auto-login si tenemos userId
  let autoLoginUrl: string | undefined;
  if (data.userId) {
    const autoLoginToken = await generateAutoLoginToken(data.userId);
    if (autoLoginToken) {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://www.quantummatter.app';
      autoLoginUrl = `${baseUrl}/auto-login?token=${autoLoginToken}`;
      result.autoLoginUrl = autoLoginUrl;
      console.log('🔑 Token de auto-login generado');
    }
  }

  // Enviar Email con credenciales y botón de auto-login
  try {
    let emailResult;
    
    // Usar email corporativo si tenemos datos del ticket
    if (data.ticket && data.visionName) {
      emailResult = await sendCorporateWelcomeEmail(data.email, {
        nombre: data.nombre,
        password: data.password,
        organizationName: data.organizationName,
        visionName: data.visionName,
        visionDate: data.ticket.visionDate,
        level: data.ticket.level,
        ticketId: data.ticket.id,
        loginUrl: data.loginUrl,
        autoLoginUrl: autoLoginUrl
      });
    } else {
      // Fallback al email anterior
      emailResult = await sendWelcomeCredentialsEmail(data.email, {
        nombre: data.nombre,
        password: data.password,
        organizationName: data.organizationName,
        visionName: data.visionName,
        loginUrl: data.loginUrl,
        autoLoginUrl: autoLoginUrl
      });
    }
    
    result.emailSent = emailResult.success;
    if (!emailResult.success) {
      result.emailError = emailResult.error;
      console.error('❌ Error enviando email de bienvenida:', emailResult.error);
    } else {
      console.log('✅ Email de bienvenida enviado');
    }
  } catch (error: any) {
    result.emailError = error.message;
    console.error('❌ Error enviando email de bienvenida:', error);
  }

  // Enviar WhatsApp con botón de auto-login (solo si hay teléfono y autoLoginUrl)
  if (data.telefono && autoLoginUrl) {
    try {
      const whatsappResult = await sendWelcomeWithAutoLoginButton(data.telefono, {
        nombre: data.nombre,
        autoLoginUrl
      });
      
      result.whatsappSent = whatsappResult.success;
      if (!whatsappResult.success) {
        result.whatsappError = whatsappResult.error;
        console.error('❌ Error enviando WhatsApp con botón:', whatsappResult.error);
      } else {
        console.log('✅ WhatsApp con botón auto-login enviado');
      }
    } catch (error: any) {
      result.whatsappError = error.message;
      console.error('❌ Error enviando WhatsApp de bienvenida:', error);
    }
  } else if (!data.telefono) {
    console.log('⚠️ No se envió WhatsApp: sin número de teléfono');
  } else if (!autoLoginUrl) {
    console.log('⚠️ No se envió WhatsApp: sin token de auto-login');
  }

  return result;
}

// Contraseña por defecto usada en registros
export const DEFAULT_PASSWORD = 'Quantum123';
