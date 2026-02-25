/**
 * Welcome Notification Service
 * Envía credenciales de bienvenida por Email y WhatsApp cuando un usuario
 * completa exitosamente cualquier flujo de pago
 */

import { sendWelcomeCredentialsEmail } from '@/lib/email';
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

  // Enviar Email con credenciales
  try {
    const emailResult = await sendWelcomeCredentialsEmail(data.email, {
      nombre: data.nombre,
      password: data.password,
      organizationName: data.organizationName,
      visionName: data.visionName,
      loginUrl: data.loginUrl
    });
    
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

  // Enviar WhatsApp con botón de auto-login (solo si hay teléfono y userId)
  if (data.telefono && data.userId) {
    try {
      // Generar token de auto-login
      const autoLoginToken = await generateAutoLoginToken(data.userId);
      
      if (autoLoginToken) {
        const baseUrl = process.env.NEXTAUTH_URL || 'https://www.quantummatter.app';
        const autoLoginUrl = `${baseUrl}/auto-login?token=${autoLoginToken}`;
        result.autoLoginUrl = autoLoginUrl;

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
      } else {
        result.whatsappError = 'No se pudo generar token de auto-login';
        console.error('❌ Error generando token de auto-login');
      }
    } catch (error: any) {
      result.whatsappError = error.message;
      console.error('❌ Error enviando WhatsApp de bienvenida:', error);
    }
  } else if (!data.telefono) {
    console.log('⚠️ No se envió WhatsApp: sin número de teléfono');
  } else if (!data.userId) {
    console.log('⚠️ No se envió WhatsApp: sin userId para generar token');
  }

  return result;
}

// Contraseña por defecto usada en registros
export const DEFAULT_PASSWORD = 'Quantum123';
