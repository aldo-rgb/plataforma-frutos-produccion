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

interface SendEmailOptions {
  fromName?: string; // Nombre personalizado del remitente
}

/**
 * Envía un correo electrónico usando Resend API
 * @param to - Dirección de correo del destinatario
 * @param subject - Asunto del correo
 * @param html - Contenido HTML del correo
 * @param options - Opciones adicionales como nombre del remitente
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: SendEmailOptions
): Promise<SendEmailResult> {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL_BASE = process.env.EMAIL_FROM || 'noreply@frutos.com';
    
    // Si se proporciona un nombre personalizado, usarlo
    let FROM_EMAIL = FROM_EMAIL_BASE;
    if (options?.fromName) {
      // Extraer solo el email si FROM_EMAIL_BASE tiene formato "Nombre <email>"
      const emailMatch = FROM_EMAIL_BASE.match(/<(.+)>/);
      const emailOnly = emailMatch ? emailMatch[1] : FROM_EMAIL_BASE;
      FROM_EMAIL = `${options.fromName} <${emailOnly}>`;
    }

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

/**
 * Plantilla: Email de Anticipo para Checkout Abandonado
 */
export async function sendAnticipoEmail(
  email: string,
  data: {
    firstName?: string;
    lastName?: string;
    visionName: string;
    originalPrice: number;
    anticipoAmount: number;
    deadlineHours: number;
    paymentUrl: string;
    orgName: string;
    logoUrl?: string;
    website?: string;
  }
): Promise<SendEmailResult> {
  const nombre = data.firstName || 'Participante';
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + data.deadlineHours);
  
  const deadlineFormatted = deadline.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `¡Reserva tu lugar en ${data.visionName}! - Anticipo disponible`;
  
  // Generar sección del logo si existe
  const logoSection = data.logoUrl ? `
          <div style="margin-bottom: 20px;">
            <img src="${data.logoUrl}" alt="${data.orgName}" style="max-height: 60px; max-width: 200px; object-fit: contain;" />
          </div>
  ` : '';

  // Generar enlace al website si existe
  const websiteLink = data.website ? `
          <p style="margin: 15px 0 0 0;">
            <a href="${data.website}" style="color: #818cf8; text-decoration: none; font-size: 13px;">
              🌐 ${data.website.replace('https://', '').replace('http://', '')}
            </a>
          </p>
  ` : '';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reserva tu lugar</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- Header con gradiente -->
        <div style="background: linear-gradient(135deg, #9333ea 0%, #4f46e5 50%, #06b6d4 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
            🎓 ¡No pierdas tu lugar!
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            ${data.visionName}
          </p>
        </div>

        <!-- Contenido principal -->
        <div style="background: #1e293b; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          
          <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hola <strong>${nombre}</strong>,
          </p>
          
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
            Notamos que no completaste tu registro en <strong style="color: #e2e8f0;">${data.visionName}</strong>. 
            ¡No te preocupes! Puedes asegurar tu lugar con un <strong style="color: #10b981;">anticipo</strong> y completar el pago después.
          </p>

          <!-- Detalles del anticipo -->
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #10b981; margin: 0 0 20px 0; font-size: 18px;">
              💰 Detalles del Anticipo
            </h3>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #94a3b8;">Precio total del programa:</span>
              <span style="color: #e2e8f0; font-weight: bold;">$${data.originalPrice.toLocaleString('es-MX')} MXN</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #94a3b8;">Anticipo para reservar:</span>
              <span style="color: #10b981; font-weight: bold; font-size: 18px;">$${data.anticipoAmount.toLocaleString('es-MX')} MXN</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgba(16, 185, 129, 0.2);">
              <span style="color: #94a3b8;">Resto a pagar después:</span>
              <span style="color: #e2e8f0;">$${(data.originalPrice - data.anticipoAmount).toLocaleString('es-MX')} MXN</span>
            </div>
          </div>

          <!-- Fecha límite -->
          <div style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 12px; padding: 20px; margin: 25px 0;">
            <p style="color: #fbbf24; font-size: 14px; line-height: 1.6; margin: 0;">
              ⏰ <strong>Fecha límite:</strong> ${deadlineFormatted}
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 10px 0 0 0;">
              Después de esta fecha, la oferta de anticipo ya no estará disponible.
            </p>
          </div>

          <!-- Botón CTA -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
              ✨ Pagar Anticipo Ahora
            </a>
          </div>

          <!-- Beneficios -->
          <div style="margin: 30px 0;">
            <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 15px 0; font-weight: bold;">
              ¿Por qué pagar el anticipo?
            </p>
            <ul style="color: #94a3b8; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>✅ <strong style="color: #e2e8f0;">Asegura tu lugar</strong> - Los cupos son limitados</li>
              <li>✅ <strong style="color: #e2e8f0;">Flexibilidad de pago</strong> - Completa el resto después</li>
              <li>✅ <strong style="color: #e2e8f0;">Sin riesgos</strong> - Comienza tu transformación hoy</li>
            </ul>
          </div>

        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 30px;">
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
            Este correo fue enviado por <strong style="color: #94a3b8;">${data.orgName}</strong>
          </p>
          ${websiteLink}
          <p style="color: #475569; font-size: 11px; margin: 10px 0 0 0;">
            Si tienes dudas, responde a este correo o contáctanos.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}
// Force rebuild Tue Feb  3 19:40:09 CST 2026
