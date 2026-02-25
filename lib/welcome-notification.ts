/**
 * Welcome Notification Service
 * Envía credenciales de bienvenida por Email y WhatsApp cuando un usuario
 * completa exitosamente cualquier flujo de pago
 */

import { sendWelcomeCredentialsEmail } from '@/lib/email';
import { sendWelcomeCredentialsWhatsApp } from '@/lib/whatsapp';

interface WelcomeNotificationData {
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
}

/**
 * Envía notificaciones de bienvenida con credenciales por Email y WhatsApp
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

  // Enviar Email
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

  // Enviar WhatsApp (solo si hay teléfono)
  if (data.telefono) {
    try {
      const whatsappResult = await sendWelcomeCredentialsWhatsApp(data.telefono, {
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        organizationName: data.organizationName,
        visionName: data.visionName,
        loginUrl: data.loginUrl
      });
      
      result.whatsappSent = whatsappResult.success;
      if (!whatsappResult.success) {
        result.whatsappError = whatsappResult.error;
        console.error('❌ Error enviando WhatsApp de bienvenida:', whatsappResult.error);
      } else {
        console.log('✅ WhatsApp de bienvenida enviado');
      }
    } catch (error: any) {
      result.whatsappError = error.message;
      console.error('❌ Error enviando WhatsApp de bienvenida:', error);
    }
  } else {
    console.log('⚠️ No se envió WhatsApp: sin número de teléfono');
  }

  return result;
}

// Contraseña por defecto usada en registros
export const DEFAULT_PASSWORD = 'Quantum123';
