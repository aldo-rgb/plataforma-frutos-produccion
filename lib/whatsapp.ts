/**
 * WhatsApp Gateway Service
 * Integración con Meta Cloud API (WhatsApp Business)
 */

interface WhatsAppMessage {
  to: string;
  templateName: string;
  variables: string[];
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envía un mensaje usando Meta Cloud API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  templateName: string,
  variables: string[]
): Promise<SendMessageResult> {
  try {
    // Limpiar número de teléfono (remover espacios, guiones, etc.)
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Verificar que tengamos las credenciales
    const {
      WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_API_VERSION = 'v18.0'
    } = process.env;

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      console.warn('⚠️ WhatsApp credentials not configured. Message not sent.');
      return {
        success: false,
        error: 'WhatsApp credentials not configured'
      };
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'es_MX'
        },
        components: [
          {
            type: 'body',
            parameters: variables.map(value => ({
              type: 'text',
              text: value
            }))
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API Error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send message'
      };
    }

    console.log('✅ WhatsApp message sent:', data.messages?.[0]?.id);
    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Plantilla A: Usuario importado por Visión
 * Variables: [nombre, nombreVision, email, tempPassword, loginUrl]
 */
export async function sendVisionWelcomeMessage(
  phoneNumber: string,
  nombre: string,
  nombreVision: string,
  email: string,
  tempPassword: string
): Promise<SendMessageResult> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.frutos.com'}/login?email=${encodeURIComponent(email)}`;
  
  return sendWhatsAppMessage(
    phoneNumber,
    'vision_welcome_template', // Debe estar aprobado en Meta
    [nombre, nombreVision, email, tempPassword, loginUrl]
  );
}

/**
 * Plantilla A (Alternativa): Magic Link en lugar de contraseña
 * Variables: [nombre, nombreVision, magicLinkUrl]
 */
export async function sendVisionMagicLinkMessage(
  phoneNumber: string,
  nombre: string,
  nombreVision: string,
  magicLinkToken: string
): Promise<SendMessageResult> {
  const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.frutos.com'}/auth/activate?token=${magicLinkToken}`;
  
  return sendWhatsAppMessage(
    phoneNumber,
    'vision_magiclink_template', // Debe estar aprobado en Meta
    [nombre, nombreVision, magicLinkUrl]
  );
}

/**
 * Plantilla B: Usuario con registro orgánico
 * Variables: [nombre, wizardUrl]
 */
export async function sendOrganicWelcomeMessage(
  phoneNumber: string,
  nombre: string
): Promise<SendMessageResult> {
  const wizardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.frutos.com'}/wizard`;
  
  return sendWhatsAppMessage(
    phoneNumber,
    'organic_welcome_template', // Debe estar aprobado en Meta
    [nombre, wizardUrl]
  );
}

/**
 * Plantilla C: Anticipo - Checkout Abandonado
 * Variables: [nombre, visionNombre, anticipoAmount, totalPrice, paymentUrl]
 */
export async function sendAnticipoReminderMessage(
  phoneNumber: string,
  nombre: string,
  visionNombre: string,
  anticipoAmount: number,
  totalPrice: number,
  paymentUrl?: string
): Promise<SendMessageResult> {
  const url = paymentUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.frutos.com'}/dashboard/my-tickets`;
  
  return sendWhatsAppMessage(
    phoneNumber,
    'anticipo_reminder_template', // Debe estar aprobado en Meta
    [
      nombre,
      visionNombre,
      `$${anticipoAmount.toLocaleString()}`,
      `$${totalPrice.toLocaleString()}`,
      url
    ]
  );
}

/**
 * Plantilla D: Mensaje de texto libre (para probar sin plantilla aprobada)
 * Usa el tipo "text" en lugar de "template"
 */
export async function sendWhatsAppTextMessage(
  phoneNumber: string,
  message: string
): Promise<SendMessageResult> {
  try {
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    const {
      WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_API_VERSION = 'v18.0'
    } = process.env;

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      console.warn('⚠️ WhatsApp credentials not configured. Message not sent.');
      return {
        success: false,
        error: 'WhatsApp credentials not configured'
      };
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: {
        body: message
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API Error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send message'
      };
    }

    console.log('✅ WhatsApp text message sent:', data.messages?.[0]?.id);
    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp text message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Genera un Magic Link Token seguro
 */
export function generateMagicLinkToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Genera una contraseña temporal segura
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%';
  
  let password = 'Frutos';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  return password;
}
