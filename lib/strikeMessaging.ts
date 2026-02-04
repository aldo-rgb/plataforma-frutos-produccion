import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';
import { processBacklogForAllPaidLevels } from '@/lib/backlog-ticket';

/**
 * Sistema de mensajes automáticos para llamadas perdidas
 * 
 * FLUJO:
 * - Strike 1: No se envía mensaje (primera advertencia)
 * - Strike 2: Envía video "2da Llamada Perdida"
 * - Strike 3: Envía video "3ra Llamada" + se suspende (puede comprar vida extra)
 * - Strike 4 (después de vida extra): Envía video "Cierre Líderes Tu Vida" + DROP + genera ticket
 */

interface StrikeMessageResult {
  success: boolean;
  videoSent?: string;
  emailSent?: boolean;
  whatsappSent?: boolean;
  isDrop?: boolean;
  ticketGenerated?: boolean;
  error?: string;
}

interface UserForMessaging {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  organizationId: number | null;
}

// Mapeo de strikes a video keys
const STRIKE_VIDEO_MAP: Record<number, string> = {
  2: 'video2daLlamadaPerdidaUrl',
  3: 'video3raLlamadaUrl',
  4: 'videoCierreLideresTuVidaUrl', // DROP - después de usar vida extra
};

const VIDEO_LABELS: Record<string, string> = {
  video2daLlamadaPerdidaUrl: '2da Llamada Perdida',
  video3raLlamadaUrl: '3ra Llamada',
  videoCierreLideresTuVidaUrl: 'Cierre Líderes Tu Vida',
};

/**
 * Envía el mensaje correspondiente según el número de strike
 */
export async function sendStrikeMessage(
  user: UserForMessaging,
  strikeNumber: number,
  enrollmentId: number,
  visionId?: number
): Promise<StrikeMessageResult> {
  try {
    // Strike 1 no envía mensaje
    if (strikeNumber === 1) {
      console.log(`⚠️ Strike 1 para ${user.nombre} - Sin mensaje automático`);
      return { success: true };
    }

    // Obtener el video key correspondiente
    const videoKey = STRIKE_VIDEO_MAP[strikeNumber];
    if (!videoKey) {
      console.log(`⚠️ No hay video configurado para strike ${strikeNumber}`);
      return { success: true };
    }

    // Obtener configuración de videos de la organización
    if (!user.organizationId) {
      console.warn(`⚠️ Usuario ${user.id} sin organización`);
      return { success: false, error: 'Usuario sin organización' };
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        video2daLlamadaPerdidaUrl: true,
        video3raLlamadaUrl: true,
        videoCierreLideresTuVidaUrl: true,
        MasterOrganization: {
          select: { name: true }
        }
      }
    });

    if (!organization) {
      return { success: false, error: 'Organización no encontrada' };
    }

    // Mapear video key a propiedad
    let videoUrl: string | null = null;
    if (videoKey === 'video2daLlamadaPerdidaUrl') videoUrl = organization.video2daLlamadaPerdidaUrl;
    else if (videoKey === 'video3raLlamadaUrl') videoUrl = organization.video3raLlamadaUrl;
    else if (videoKey === 'videoCierreLideresTuVidaUrl') videoUrl = organization.videoCierreLideresTuVidaUrl;
    if (!videoUrl) {
      console.warn(`⚠️ Video ${videoKey} no configurado para organización ${organization.id}`);
      return { success: true }; // No es error, simplemente no hay video configurado
    }

    const videoLabel = VIDEO_LABELS[videoKey] || 'Video';
    const senderName = organization.MasterOrganization?.name || organization.name || 'Tu Equipo';

    // Generar mensajes personalizados
    const { emailContent, whatsappContent } = generateStrikeMessages(
      user.nombre,
      strikeNumber,
      videoUrl,
      videoLabel
    );

    let emailSent = false;
    let whatsappSent = false;
    let emailError: string | null = null;
    let whatsappError: string | null = null;

    // Enviar email
    if (user.email) {
      try {
        const emailResult = await sendEmail(
          user.email,
          `⚠️ ${videoLabel} - ${organization.name}`,
          formatStrikeEmailHtml(emailContent, videoLabel, strikeNumber),
          { fromName: senderName }
        );

        if (emailResult.success) {
          emailSent = true;
          console.log(`📧 Email de strike ${strikeNumber} enviado a ${user.email}`);
        } else {
          emailError = emailResult.error || 'Error desconocido';
        }
      } catch (err: any) {
        emailError = err.message || 'Error de envío';
      }

      // Log del email
      await prisma.automationMessageLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          videoKey,
          videoLabel,
          channel: 'EMAIL',
          recipient: user.email,
          status: emailSent ? 'SENT' : 'FAILED',
          errorMessage: emailError,
          sentAt: emailSent ? new Date() : null,
          source: 'CRON',
        }
      });
    }

    // Enviar WhatsApp
    if (user.telefono) {
      try {
        const whatsappResult = await sendWhatsAppTextMessage(
          user.telefono,
          whatsappContent
        );

        if (whatsappResult.success) {
          whatsappSent = true;
          console.log(`📱 WhatsApp de strike ${strikeNumber} enviado a ${user.telefono}`);
        } else {
          whatsappError = whatsappResult.error || 'Error desconocido';
        }
      } catch (err: any) {
        whatsappError = err.message || 'Error de envío';
      }

      // Log del WhatsApp
      await prisma.automationMessageLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          videoKey,
          videoLabel,
          channel: 'WHATSAPP',
          recipient: user.telefono,
          status: whatsappSent ? 'SENT' : 'FAILED',
          errorMessage: whatsappError,
          sentAt: whatsappSent ? new Date() : null,
          source: 'CRON',
        }
      });
    }

    const result: StrikeMessageResult = {
      success: emailSent || whatsappSent,
      videoSent: videoLabel,
      emailSent,
      whatsappSent,
    };

    // Si es strike 4 (DROP después de vida extra), procesar DROP y ticket
    if (strikeNumber === 4 && visionId) {
      result.isDrop = true;
      
      try {
        // Marcar enrollment como DROP
        await prisma.programEnrollment.update({
          where: { id: enrollmentId },
          data: { status: 'DROP' }
        });

        // Generar ticket para siguiente visión
        const ticketResult = await processBacklogForAllPaidLevels(
          user.id,
          visionId,
          user.organizationId,
          'DROP',
          'BASIC' // Asumimos que es nivel básico, ajustar según el contexto
        );

        result.ticketGenerated = ticketResult.success && ticketResult.totalTickets > 0;
        console.log(`🎫 Ticket generado para ${user.nombre}: ${result.ticketGenerated}`);
      } catch (err) {
        console.error(`❌ Error procesando DROP para ${user.nombre}:`, err);
      }
    }

    return result;

  } catch (error) {
    console.error(`Error enviando mensaje de strike ${strikeNumber}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Genera los mensajes personalizados para cada strike
 */
function generateStrikeMessages(
  nombre: string,
  strikeNumber: number,
  videoUrl: string,
  videoLabel: string
): { emailContent: string; whatsappContent: string } {
  
  const messages: Record<number, { emailContent: string; whatsappContent: string }> = {
    2: {
      emailContent: `Hola ${nombre},

⚠️ Esta es tu SEGUNDA llamada perdida.

Sabemos que la vida tiene imprevistos, pero tu compromiso con tu transformación es importante.

🎯 Tienes 1 oportunidad más antes de que tu programa se pause.

Mira este video importante:
${videoUrl}

💪 No dejes que este momento de distracción defina tu camino.

Con fe en ti,
Tu equipo`,
      whatsappContent: `⚠️ Hola ${nombre}!

Esta es tu *2da llamada perdida*.

Te queda *1 oportunidad* más antes de pausar tu programa.

🎬 Video importante para ti:
${videoUrl}

💪 ¡Aún estás a tiempo!`
    },
    3: {
      emailContent: `${nombre},

🔔 ALERTA: Tu programa ha sido PAUSADO.

Has alcanzado 3 llamadas perdidas y tu sistema está ahora en modo de espera.

Pero NO todo está perdido...

✨ TIENES UNA OPORTUNIDAD:
Puedes comprar una VIDA EXTRA usando 1000 Puntos Cuánticos para reactivar tu programa.

Mira este video urgente:
${videoUrl}

⏰ No dejes pasar esta oportunidad de retomar tu camino.

Con esperanza,
Tu equipo`,
      whatsappContent: `🔔 *${nombre}*, tu programa está PAUSADO.

3 llamadas perdidas = Sistema en espera.

✨ *TIENES UNA OPORTUNIDAD:*
Compra una VIDA EXTRA (1000 PC) para reactivarte.

🎬 Video urgente:
${videoUrl}

⏰ ¡Actúa ahora!`
    },
    4: {
      emailContent: `${nombre},

💔 Tu programa de disciplina ha terminado.

Después de usar tu vida extra, has perdido una llamada más, lo que significa que tu ciclo actual ha concluido.

Sin embargo, esto no es el fin de tu historia...

🎫 BUENAS NOTICIAS:
Se ha generado un TICKET DE CORTESÍA para que puedas retomar en la SIGUIENTE VISIÓN sin costo adicional.

Por favor mira este video de cierre:
${videoUrl}

🌟 Cada final es un nuevo comienzo. Te esperamos en la próxima visión con más fuerza.

Con cariño,
Tu equipo`,
      whatsappContent: `💔 *${nombre}*, tu programa actual ha terminado.

Usaste tu vida extra y perdiste otra llamada.

🎫 *PERO...* tienes un TICKET para la SIGUIENTE VISIÓN.

🎬 Video de cierre:
${videoUrl}

🌟 ¡Te esperamos pronto!`
    }
  };

  return messages[strikeNumber] || {
    emailContent: `Hola ${nombre}, mira este video: ${videoUrl}`,
    whatsappContent: `Hola ${nombre}! 🎬 ${videoUrl}`
  };
}

/**
 * Formatea el email HTML para strikes
 */
function formatStrikeEmailHtml(content: string, title: string, strikeNumber: number): string {
  const urgencyColor = strikeNumber >= 3 ? '#ef4444' : '#f59e0b'; // Rojo si es crítico, amarillo si es advertencia
  
  const htmlContent = content
    .split('\n')
    .map(line => {
      if (line.includes('http')) {
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          return `<div style="text-align: center; margin: 30px 0;">
            <a href="${urlMatch[1]}" style="display: inline-block; background: linear-gradient(135deg, ${urgencyColor}, #dc2626); color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px;">
              🎬 VER VIDEO AHORA
            </a>
          </div>`;
        }
      }
      if (line.trim().startsWith('✨') || line.trim().startsWith('🎫')) {
        return `<p style="color: #10b981; margin: 12px 0; padding: 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; font-weight: bold;">${line}</p>`;
      }
      if (line.trim().startsWith('⚠️') || line.trim().startsWith('🔔') || line.trim().startsWith('💔')) {
        return `<p style="color: ${urgencyColor}; margin: 12px 0; font-size: 18px; font-weight: bold;">${line}</p>`;
      }
      if (line.trim()) {
        return `<p style="color: #cbd5e1; margin: 12px 0; line-height: 1.6;">${line}</p>`;
      }
      return '<br/>';
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: ${urgencyColor}; font-size: 28px; margin: 0;">⚠️ ${title}</h1>
          <p style="color: #94a3b8; margin-top: 10px;">Strike ${strikeNumber} de ${strikeNumber >= 4 ? '4' : '3'}</p>
        </div>
        
        <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 30px; border: 1px solid ${urgencyColor}40;">
          ${htmlContent}
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            Sistema de Disciplina - Quantummatter.app
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
