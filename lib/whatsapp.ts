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

// ===================================================
// QUANTUM PAY-BOT: Sistema de Comprobantes por WhatsApp
// ===================================================

/**
 * Normaliza un número de teléfono para matching
 * Retorna el número en formato internacional sin +
 */
export function normalizePhoneNumber(phone: string): string {
  // Remover todo excepto dígitos
  let clean = phone.replace(/[^\d]/g, '');
  
  // Si empieza con 52 (México) pero no tiene 10 dígitos después, ajustar
  if (clean.length === 10) {
    // Agregar código de México
    clean = '52' + clean;
  } else if (clean.length === 12 && clean.startsWith('52')) {
    // Ya tiene código de país
  } else if (clean.length === 13 && clean.startsWith('521')) {
    // Tiene 521 (México móvil antiguo), quitar el 1 extra
    clean = '52' + clean.slice(3);
  }
  
  return clean;
}

/**
 * Pay-Bot: Envía mensaje inicial cuando se crea orden de transferencia
 */
export async function sendTransferOrderCreatedMessage(
  phoneNumber: string,
  userName: string,
  amount: number,
  ticketType: string,
  orderReference: string,
  bankConfig: {
    bankName: string;
    clabe: string;
    holder: string;
  }
): Promise<SendMessageResult> {
  const ticketLabel = ticketType === 'FULL_VISION' ? 'Boleto Full Vision' : 'Boleto Básico';
  
  const message = `🤖 *Quantum Pay-Bot* 

¡Hola ${userName}! 👋

Tu orden *${orderReference}* está lista.

💰 *Monto a transferir:* $${amount.toLocaleString('es-MX')} MXN
🎫 *Concepto:* ${ticketLabel}

📋 *Datos bancarios:*
🏦 Banco: ${bankConfig.bankName}
📝 CLABE: ${bankConfig.clabe}
👤 Beneficiario: ${bankConfig.holder}

*IMPORTANTE:* Cuando realices la transferencia, responde a este mensaje con una *foto del comprobante* y lo revisaremos de inmediato.

⏰ Tu orden expira en 72 horas.

_Si alguien más va a pagar por ti, dile que envíe el comprobante a este número junto con tu referencia: *${orderReference}*_`;

  return sendWhatsAppTextMessage(phoneNumber, message);
}

/**
 * Pay-Bot: Confirma recepción del comprobante
 */
export async function sendReceiptReceivedMessage(
  phoneNumber: string,
  userName: string,
  orderReference: string
): Promise<SendMessageResult> {
  const message = `✅ *Comprobante Recibido*

¡Gracias ${userName}! 

Hemos recibido tu comprobante para la orden *${orderReference}*.

🔍 El Director/Administrador lo está revisando y te notificaremos cuando sea aprobado.

_Tiempo estimado de revisión: 1-24 horas en días hábiles_`;

  return sendWhatsAppTextMessage(phoneNumber, message);
}

/**
 * Pay-Bot: Pide referencia cuando el teléfono no coincide
 */
export async function sendAskForReferenceMessage(
  phoneNumber: string
): Promise<SendMessageResult> {
  const message = `🤖 *Quantum Pay-Bot*

¡Hola! Recibí tu comprobante, pero no encontré una orden pendiente asociada a este número.

Si estás pagando *por otra persona*, por favor envía el *código de referencia* de la orden (formato: TRF-XXXXX).

_El usuario que creó la orden recibió este código cuando inició su compra._`;

  return sendWhatsAppTextMessage(phoneNumber, message);
}

/**
 * Pay-Bot: Confirma que se vinculó el comprobante con referencia manual
 */
export async function sendReferenceMatchedMessage(
  phoneNumber: string,
  userName: string,
  orderReference: string
): Promise<SendMessageResult> {
  const message = `✅ *Comprobante Vinculado*

He encontrado la orden *${orderReference}* de ${userName}.

Tu comprobante ha sido recibido y está siendo revisado por el Director.

_Te notificaremos cuando sea aprobado._`;

  return sendWhatsAppTextMessage(phoneNumber, message);
}

/**
 * Pay-Bot: Notifica que la referencia no existe
 */
export async function sendReferenceNotFoundMessage(
  phoneNumber: string,
  reference: string
): Promise<SendMessageResult> {
  const message = `❌ *Referencia No Encontrada*

No encontré ninguna orden con la referencia *${reference}*.

Por favor verifica el código e intenta de nuevo. El formato correcto es: TRF-XXXXX

_Si tienes dudas, contacta al Director de tu escuela._`;

  return sendWhatsAppTextMessage(phoneNumber, message);
}

/**
 * Pay-Bot: Notifica aprobación del pago
 */
export async function sendPaymentApprovedMessage(
  phoneNumber: string,
  userName: string,
  orderReference: string,
  email: string,
  tempPassword: string
): Promise<SendMessageResult> {
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plataforma-frutos.com';
  
  const message = `🎉 *¡PAGO APROBADO!* 🎉

¡Felicidades ${userName}! Tu pago ha sido verificado y aprobado.

📋 *Orden:* ${orderReference}

🚀 *Ya puedes acceder a la plataforma:*
🔗 ${loginUrl}/login

📧 *Tu correo:* ${email}
🔑 *Contraseña temporal:* ${tempPassword}

_Cambia tu contraseña después de tu primer inicio de sesión._

¡Bienvenido/a a Quantum Matter! 🌟`;

  return sendWhatsAppTextMessage(phoneNumber, message);
}

/**
 * Pay-Bot: Notifica rechazo del pago
 */
export async function sendPaymentRejectedMessage(
  phoneNumber: string,
  userName: string,
  orderReference: string,
  reason: string
): Promise<SendMessageResult> {
  const message = `⚠️ *Comprobante No Válido*

Hola ${userName}, revisamos tu comprobante para la orden *${orderReference}* pero no pudimos validarlo.

📝 *Motivo:* ${reason}

Por favor envía un nuevo comprobante que muestre claramente:
✅ Monto correcto
✅ CLABE de destino
✅ Fecha y hora de la operación
✅ Número de autorización

_Si crees que es un error, contacta al Director de tu escuela._`;

  return sendWhatsAppTextMessage(phoneNumber, message);
}

/**
 * Pay-Bot: Descarga imagen de WhatsApp Media
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{
  success: boolean;
  imageBuffer?: Buffer;
  mimeType?: string;
  error?: string;
}> {
  try {
    const {
      WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_API_VERSION = 'v18.0'
    } = process.env;

    if (!WHATSAPP_ACCESS_TOKEN) {
      return { success: false, error: 'WhatsApp credentials not configured' };
    }

    // Primero obtener la URL del media
    const mediaUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`;
    
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
      }
    });

    if (!mediaResponse.ok) {
      const error = await mediaResponse.json();
      return { success: false, error: error.error?.message || 'Failed to get media URL' };
    }

    const mediaData = await mediaResponse.json();
    
    // Descargar el archivo
    const downloadResponse = await fetch(mediaData.url, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
      }
    });

    if (!downloadResponse.ok) {
      return { success: false, error: 'Failed to download media' };
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    return {
      success: true,
      imageBuffer,
      mimeType: mediaData.mime_type || 'image/jpeg'
    };

  } catch (error: any) {
    console.error('❌ Error downloading WhatsApp media:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía mensaje de WhatsApp con credenciales de bienvenida
 * Usa mensaje de texto libre (no template) para enviar las credenciales
 */
export async function sendWelcomeCredentialsWhatsApp(
  phoneNumber: string,
  data: {
    nombre: string;
    email: string;
    password: string;
    organizationName: string;
    visionName?: string;
    loginUrl?: string;
  }
): Promise<SendMessageResult> {
  try {
    const cleanPhone = normalizePhoneNumber(phoneNumber);
    const loginUrl = data.loginUrl || 'https://impactocuantico.net/auth/login';
    
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

    // Mensaje de texto con las credenciales
    const messageText = `🎉 *¡Bienvenid@ a ${data.organizationName}!*
${data.visionName ? `📍 ${data.visionName}\n` : ''}
Hola *${data.nombre}*, tu registro fue exitoso.

🔐 *Tus credenciales de acceso:*

📧 *Correo:* ${data.email}
🔑 *Contraseña:* ${data.password}

👉 *Inicia sesión aquí:*
${loginUrl}

⚠️ Te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.

¡Comienza tu transformación! 🚀`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: messageText
      }
    };

    console.log(`📱 Enviando credenciales WhatsApp a ${cleanPhone}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API Error:', responseData);
      return {
        success: false,
        error: responseData.error?.message || 'Failed to send WhatsApp message'
      };
    }

    console.log('✅ WhatsApp credentials sent:', responseData.messages?.[0]?.id);
    return {
      success: true,
      messageId: responseData.messages?.[0]?.id
    };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp credentials:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
