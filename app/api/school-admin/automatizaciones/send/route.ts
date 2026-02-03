import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

interface SendRequest {
  users: Array<{
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
  }>;
  videoKey: string;
  videoUrl: string;
  sendMethod: 'email' | 'whatsapp' | 'both';
  messages: {
    email: string;
    whatsapp: string;
  };
}

/**
 * POST /api/school-admin/automatizaciones/send
 * Envía mensajes promocionales de videos a los usuarios seleccionados
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar rol
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo directores pueden enviar mensajes' },
        { status: 403 }
      );
    }

    const body: SendRequest = await request.json();
    const { users, videoKey, videoUrl, sendMethod, messages } = body;

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se seleccionaron usuarios' },
        { status: 400 }
      );
    }

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: 'No hay URL de video configurada' },
        { status: 400 }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const videoLabel = getVideoLabel(videoKey);

    // Obtener información de la organización y su MasterOrganization para personalizar
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId! },
      select: { 
        name: true,
        MasterOrganization: {
          select: { name: true }
        }
      }
    });

    // El nombre del remitente será: MasterOrganization > Organization > "Tu Equipo"
    const senderName = organization?.MasterOrganization?.name || organization?.name || 'Tu Equipo';
    // El nombre para el subject del email usa el nombre de la organización específica
    const organizationName = organization?.name || 'Tu Equipo';

    for (const targetUser of users) {
      try {
        // Personalizar mensajes
        const personalizedEmail = messages.email
          .replace(/{nombre}/g, targetUser.nombre)
          .replace(/{videoUrl}/g, videoUrl);
        
        const personalizedWhatsapp = messages.whatsapp
          .replace(/{nombre}/g, targetUser.nombre)
          .replace(/{videoUrl}/g, videoUrl);

        let emailSent = false;
        let whatsappSent = false;
        let emailError: string | null = null;
        let whatsappError: string | null = null;

        // Enviar email
        if ((sendMethod === 'email' || sendMethod === 'both') && targetUser.email) {
          try {
            const emailResult = await sendEmail(
              targetUser.email,
              `🎬 ${videoLabel} - ${organizationName}`,
              formatEmailHtml(personalizedEmail, videoLabel),
              { fromName: senderName }
            );

            if (emailResult.success) {
              emailSent = true;
              console.log(`📧 Email enviado a ${targetUser.email}`);
            } else {
              emailError = emailResult.error || 'Error desconocido';
              console.warn(`⚠️ Email fallido a ${targetUser.email}:`, emailResult.error);
            }
          } catch (err: any) {
            emailError = err.message || 'Error de envío';
            console.error(`❌ Error email a ${targetUser.email}:`, err);
          }

          // Guardar log de email
          await prisma.automationMessageLog.create({
            data: {
              organizationId: user.organizationId!,
              userId: targetUser.id,
              videoKey,
              videoLabel,
              channel: 'EMAIL',
              recipient: targetUser.email,
              status: emailSent ? 'SENT' : 'FAILED',
              errorMessage: emailError,
              sentAt: emailSent ? new Date() : null,
              source: 'MANUAL',
            }
          });
        }

        // Enviar WhatsApp
        if ((sendMethod === 'whatsapp' || sendMethod === 'both') && targetUser.telefono) {
          try {
            const whatsappResult = await sendWhatsAppTextMessage(
              targetUser.telefono,
              personalizedWhatsapp
            );

            if (whatsappResult.success) {
              whatsappSent = true;
              console.log(`📱 WhatsApp enviado a ${targetUser.telefono}`);
            } else {
              whatsappError = whatsappResult.error || 'Error desconocido';
              console.warn(`⚠️ WhatsApp fallido a ${targetUser.telefono}:`, whatsappResult.error);
            }
          } catch (err: any) {
            whatsappError = err.message || 'Error de envío';
            console.error(`❌ Error WhatsApp a ${targetUser.telefono}:`, err);
          }

          // Guardar log de WhatsApp
          await prisma.automationMessageLog.create({
            data: {
              organizationId: user.organizationId!,
              userId: targetUser.id,
              videoKey,
              videoLabel,
              channel: 'WHATSAPP',
              recipient: targetUser.telefono,
              status: whatsappSent ? 'SENT' : 'FAILED',
              errorMessage: whatsappError,
              sentAt: whatsappSent ? new Date() : null,
              source: 'MANUAL',
            }
          });
        }

        // Contar como enviado si al menos un método funcionó
        if (emailSent || whatsappSent) {
          sent++;
          console.log(`✅ Mensaje enviado a ${targetUser.nombre} - Email: ${emailSent}, WhatsApp: ${whatsappSent}`);
        } else {
          failed++;
          errors.push(`No se pudo contactar a ${targetUser.nombre}`);
        }

      } catch (userError) {
        console.error(`Error procesando usuario ${targetUser.id}:`, userError);
        failed++;
        errors.push(`Error con ${targetUser.nombre}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error sending messages:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getVideoLabel(videoKey: string): string {
  const labels: Record<string, string> = {
    videoBienvenidaLideres1Url: 'Bienvenida Básico',
    videoBienvenidaLideres2Url: 'Bienvenida Básico 2',
    video2daLlamadaPerdidaUrl: '2da Llamada Perdida',
    videoInvitacionTransformadoraUrl: 'Invitación Transformadora',
    video3raLlamadaUrl: '3ra Llamada',
    videoEnrolamientoUrl: 'Enrolamiento',
    videoCierreLideresTuVidaUrl: 'Cierre Líderes Tu Vida'
  };
  return labels[videoKey] || 'Video Promocional';
}

function formatEmailHtml(content: string, title: string): string {
  // Convertir el texto plano a HTML con formato
  const htmlContent = content
    .split('\n')
    .map(line => {
      // Detectar líneas con emojis al inicio como títulos
      if (/^[🌟🚀⏰✨🔔🎯🔥💡⚡👉💎].+[🌟🚀⏰✨🔔🎯🔥💡⚡👉💎]?$/.test(line.trim())) {
        return `<h2 style="color: #a855f7; font-size: 20px; margin: 20px 0; text-align: center;">${line}</h2>`;
      }
      // Detectar URLs
      if (line.includes('http')) {
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          return `<div style="text-align: center; margin: 30px 0;">
            <a href="${urlMatch[1]}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px;">
              🎬 VER VIDEO AHORA
            </a>
          </div>`;
        }
      }
      // Detectar listas con ✅
      if (line.trim().startsWith('✅')) {
        return `<p style="color: #10b981; margin: 8px 0; padding-left: 10px;">${line}</p>`;
      }
      // Líneas normales
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
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #06b6d4; font-size: 28px; margin: 0;">🎬 ${title}</h1>
        </div>
        
        <!-- Content -->
        <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 30px; border: 1px solid #334155;">
          ${htmlContent}
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            Este mensaje fue enviado con Quantummatter.app para impulsar tu transformación
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
