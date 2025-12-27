/**
 * Email Service
 * Servicio para enviar correos electrónicos usando Resend
 */

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envía un correo electrónico usando Resend API
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@frutos.com';

    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured. Email not sent.');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API Error:', data);
      return {
        success: false,
        error: data.message || 'Failed to send email'
      };
    }

    console.log('✅ Email sent:', data.id);
    return {
      success: true,
      messageId: data.id
    };

  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Plantilla: Usuario importado con Magic Link
 */
export async function sendVisionMagicLinkEmail(
  email: string,
  nombre: string,
  nombreVision: string,
  magicLinkToken: string
): Promise<SendEmailResult> {
  const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.frutos.com'}/auth/activate?token=${magicLinkToken}`;
  
  const subject = `¡Bienvenido a ${nombreVision}! - Activa tu cuenta`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a Quantum</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #4f46e5 100%); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h1 style="color: #f1f5f9; font-size: 28px; font-weight: bold; margin: 0;">¡Bienvenido a Quantum!</h1>
        </div>

        <!-- Card Principal -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; padding: 40px; margin-bottom: 30px;">
          
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hola <strong style="color: #a78bfa;">${nombre}</strong>,
          </p>
          
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            ¡Bienvenido a tu transformación con <strong style="color: #a78bfa;">${nombreVision}</strong>!
          </p>

          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hemos creado tu cuenta en Quantum. Para activarla de forma segura, haz clic en el siguiente botón:
          </p>

          <!-- Botón CTA -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #4f46e5 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 10px 25px rgba(147, 51, 234, 0.3);">
              🚀 Activar Mi Cuenta
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
            O copia y pega este enlace en tu navegador:<br>
            <a href="${magicLinkUrl}" style="color: #a78bfa; word-break: break-all;">${magicLinkUrl}</a>
          </p>

        </div>

        <!-- Info Box -->
        <div style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <p style="color: #fbbf24; font-size: 14px; line-height: 1.6; margin: 0;">
            ⏰ <strong>Importante:</strong> Este enlace expira en 7 días. Si no lo usas antes, deberás solicitar uno nuevo.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 30px; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
            Este correo fue enviado por <strong style="color: #94a3b8;">Quantum - Plataforma de Transformación</strong>
          </p>
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 10px 0 0 0;">
            Si no solicitaste esta cuenta, puedes ignorar este mensaje.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Plantilla: Usuario orgánico
 */
export async function sendOrganicWelcomeEmail(
  email: string,
  nombre: string
): Promise<SendEmailResult> {
  const wizardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.frutos.com'}/wizard`;
  
  const subject = '¡Bienvenido a la tribu Quantum! 🚀';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a Quantum</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <h1 style="color: #f1f5f9; font-size: 28px; font-weight: bold; margin: 0;">¡Bienvenido a la tribu! 🚀</h1>
        </div>

        <!-- Card Principal -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; padding: 40px; margin-bottom: 30px;">
          
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hola <strong style="color: #06b6d4;">${nombre}</strong>,
          </p>
          
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            ¡Tu cuenta está lista! Es momento de diseñar la vida que siempre has soñado.
          </p>

          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Da el primer paso completando tu Wizard de Planeación:
          </p>

          <!-- Botón CTA -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${wizardUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 10px 25px rgba(6, 182, 212, 0.3);">
              🎯 Empezar Mi Transformación
            </a>
          </div>

        </div>

        <!-- Features -->
        <div style="display: grid; gap: 15px; margin-bottom: 30px;">
          <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 20px;">
            <p style="color: #22d3ee; font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">✨ Define tu Carta de Frutos</p>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">Establece tus metas en las 7 áreas de tu vida</p>
          </div>
          
          <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 20px;">
            <p style="color: #a78bfa; font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">🎮 Sistema de Gamificación</p>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">Gana puntos, sube de nivel y desbloquea logros</p>
          </div>
          
          <div style="background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 12px; padding: 20px;">
            <p style="color: #f472b6; font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">👥 Mentoría Personalizada</p>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">Conecta con mentores expertos en tu viaje</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 30px; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
            Este correo fue enviado por <strong style="color: #94a3b8;">Quantum - Plataforma de Transformación</strong>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Plantilla: Contraseña temporal (Fallback si no hay Magic Link)
 */
export async function sendVisionPasswordEmail(
  email: string,
  nombre: string,
  nombreVision: string,
  userEmail: string,
  tempPassword: string
): Promise<SendEmailResult> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.frutos.com'}/login?email=${encodeURIComponent(userEmail)}`;
  
  const subject = `¡Bienvenido a ${nombreVision}! - Tus credenciales de acceso`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Credenciales de Acceso</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #f1f5f9; font-size: 28px; font-weight: bold; margin: 0;">Credenciales de Acceso</h1>
        </div>

        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; padding: 40px;">
          
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hola <strong style="color: #a78bfa;">${nombre}</strong>,
          </p>
          
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Bienvenido a <strong>${nombreVision}</strong>. Aquí están tus credenciales de acceso temporal:
          </p>

          <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 24px; margin: 30px 0;">
            <p style="color: #a78bfa; font-size: 14px; font-weight: bold; margin: 0 0 16px 0;">🔐 Tus Credenciales:</p>
            
            <div style="margin-bottom: 16px;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0;">Usuario (Email):</p>
              <p style="color: #f1f5f9; font-size: 16px; font-family: 'Courier New', monospace; margin: 0; word-break: break-all;">${userEmail}</p>
            </div>
            
            <div>
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0;">Contraseña Temporal:</p>
              <p style="color: #f1f5f9; font-size: 20px; font-family: 'Courier New', monospace; font-weight: bold; margin: 0;">${tempPassword}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #4f46e5 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: bold; font-size: 16px;">
              🚀 Ingresar a Quantum
            </a>
          </div>

        </div>

        <div style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 12px; padding: 20px; margin: 30px 0;">
          <p style="color: #fbbf24; font-size: 14px; line-height: 1.6; margin: 0;">
            ⚠️ <strong>Importante:</strong> Por seguridad, deberás cambiar esta contraseña temporal la primera vez que ingreses.
          </p>
        </div>

        <div style="text-align: center; padding-top: 30px; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
            Este correo fue enviado por <strong style="color: #94a3b8;">Quantum</strong>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}
