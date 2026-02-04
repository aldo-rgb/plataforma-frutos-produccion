import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ticketId, recipientEmail } = body;

    if (!ticketId || !recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Buscar usuario actual
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Buscar ticket con todas las relaciones necesarias
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        vision: {
          select: {
            id: true,
            startDate: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            transfersEnabled: true,
            transferDeadlineDays: true,
            customLoginUrl: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Validar que la organización permita transferencias
    if (!ticket.organization?.transfersEnabled) {
      return NextResponse.json(
        { success: false, error: 'Esta organización no permite transferencias de tickets' },
        { status: 400 }
      );
    }

    // RE-VALIDAR todas las condiciones (seguridad)
    if (ticket.ownerId !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para transferir este ticket' },
        { status: 403 }
      );
    }

    // Solo tickets BASIC pueden iniciar una transferencia
    if (ticket.level !== 'BASIC') {
      return NextResponse.json(
        { success: false, error: 'Solo puedes transferir desde el ticket Básico' },
        { status: 400 }
      );
    }

    if (ticket.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Solo puedes transferir tickets activos' },
        { status: 400 }
      );
    }

    if (!ticket.isTransferable) {
      return NextResponse.json(
        { success: false, error: 'Este ticket ya no es transferible' },
        { status: 400 }
      );
    }

    const now = new Date();
    const visionStartDate = new Date(ticket.vision.startDate);
    const deadlineDays = ticket.organization.transferDeadlineDays || 0;
    const transferDeadline = new Date(visionStartDate.getTime() - (deadlineDays * 24 * 60 * 60 * 1000));

    if (now > transferDeadline) {
      return NextResponse.json(
        { success: false, error: 'El tiempo para transferir ha expirado' },
        { status: 400 }
      );
    }

    if (recipientEmail.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'No puedes transferir un ticket a ti mismo' },
        { status: 400 }
      );
    }

    // Buscar o crear usuario receptor
    const DEFAULT_PASSWORD = 'Quantum123.';
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    let recipient = await prisma.usuario.findUnique({
      where: { email: recipientEmail.toLowerCase() },
    });

    if (!recipient) {
      // Crear nuevo usuario con contraseña por defecto que deberá cambiar
      const recipientName = recipientEmail.split('@')[0];

      recipient = await prisma.usuario.create({
        data: {
          email: recipientEmail.toLowerCase(),
          nombre: recipientName,
          password: hashedPassword,
          rol: 'PARTICIPANTE',
          isActive: true,
          requirePasswordChange: true, // Obligar a cambiar contraseña al primer login
          organizationId: ticket.organizationId,
        },
      });
      
      console.log(`✅ Nuevo usuario creado para transferencia: ${recipient.email}`);
    } else {
      // Usuario ya existe - actualizar contraseña a Quantum123. y exigir cambio
      recipient = await prisma.usuario.update({
        where: { id: recipient.id },
        data: {
          password: hashedPassword,
          requirePasswordChange: true,
        },
      });
      
      console.log(`🔄 Usuario existente actualizado para transferencia: ${recipient.email}`);
    }

    // Buscar TODOS los tickets activos del usuario para la misma visión
    const allUserTickets = await prisma.ticket.findMany({
      where: {
        ownerId: currentUser.id,
        visionId: ticket.visionId,
        status: 'ACTIVE',
      },
      select: { id: true, level: true },
    });

    // Transferir TODOS los tickets del usuario para esta visión
    const transferredTickets = await prisma.$transaction(
      allUserTickets.map((t) =>
        prisma.ticket.update({
          where: { id: t.id },
          data: {
            ownerId: recipient!.id,
            status: 'TRANSFERRED',
            isTransferable: false,
            transferredAt: now,
            transferredTo: recipient!.id,
          },
        })
      )
    );

    // Obtener info del ticket principal actualizado para la respuesta
    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        owner: {
          select: {
            nombre: true,
            email: true,
          },
        },
        vision: {
          select: {
            nombre: true,
            startDate: true,
          },
        },
      },
    });

    // Crear lista de niveles transferidos
    const transferredLevels = allUserTickets.map(t => t.level);

    // =====================================================
    // ENVIAR NOTIFICACIONES AL RECEPTOR
    // =====================================================
    const APP_URL = process.env.NEXTAUTH_URL || 'https://quantummatter.app';
    const orgSlug = ticket.organization?.slug || '';
    
    // Usar customLoginUrl si está configurado, sino construir la URL por defecto
    const loginUrl = ticket.organization?.customLoginUrl 
      ? ticket.organization.customLoginUrl
      : (orgSlug 
          ? `${APP_URL}/${orgSlug}/login`
          : `${APP_URL}/login`);
    
    const visionDate = updatedTicket?.vision.startDate 
      ? new Date(updatedTicket.vision.startDate).toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'Por confirmar';

    // Formatear niveles transferidos
    const levelNames: Record<string, string> = {
      'BASIC': 'Básico',
      'PLUS': 'Plus', 
      'PREMIUM': 'Premium'
    };
    const nivelesTexto = transferredLevels.map(l => levelNames[l] || l).join(', ');

    // 📧 Enviar EMAIL
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Recibiste un Ticket!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #00D4AA 0%, #00B4D8 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                🎫 ¡Recibiste un Ticket!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 18px; margin: 0 0 20px 0;">
                ¡Hola <strong style="color: #00B4D8;">${recipient!.nombre}</strong>!
              </p>
              
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                <strong style="color: #333333;">${currentUser.nombre}</strong> te ha transferido un ticket para participar en el programa de transformación.
              </p>
              
              <!-- Ticket Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Organización:</span>
                          <span style="color: #1e293b; font-size: 16px; font-weight: 600; float: right;">${ticket.organization?.name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Visión:</span>
                          <span style="color: #1e293b; font-size: 16px; font-weight: 600; float: right;">${updatedTicket?.vision.nombre || 'N/A'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Fecha de inicio:</span>
                          <span style="color: #00B4D8; font-size: 16px; font-weight: 600; float: right;">${visionDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #64748b; font-size: 14px;">Nivel(es):</span>
                          <span style="color: #10b981; font-size: 16px; font-weight: 600; float: right;">${nivelesTexto}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #059669; margin: 0 0 15px 0; font-size: 16px;">🔐 Tus credenciales de acceso:</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #555555; font-size: 14px;">Usuario (email):</span>
                          <div style="color: #1e293b; font-size: 18px; font-weight: 700; font-family: monospace; background: #ffffff; padding: 12px; border-radius: 8px; margin-top: 5px; border: 1px solid #e2e8f0;">${recipient!.email}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #555555; font-size: 14px;">Contraseña temporal:</span>
                          <div style="color: #d97706; font-size: 24px; font-weight: 700; font-family: monospace; background: #fffbeb; padding: 12px; border-radius: 8px; margin-top: 5px; border: 1px solid #fcd34d;">Quantum123.</div>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #b45309; font-size: 13px; margin: 15px 0 0 0; padding: 12px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      ⚠️ <strong>Importante:</strong> Al iniciar sesión por primera vez, el sistema te pedirá que cambies tu contraseña.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px 0;">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D4AA 0%, #00B4D8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(0, 180, 216, 0.3);">
                      🚀 Iniciar Sesión Ahora
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
                O copia este enlace: <br>
                <a href="${loginUrl}" style="color: #00B4D8; word-break: break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Este ticket fue transferido por ${currentUser.nombre}.<br>
                Si no esperabas este correo, puedes ignorarlo.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await sendEmail(
        recipient!.email,
        `🎫 ¡${currentUser.nombre} te transfirió un ticket para ${updatedTicket?.vision.nombre || 'Quantum Matter'}!`,
        emailHtml,
        { fromName: ticket.organization?.name || 'Quantum Matter' }
      );
      console.log(`📧 Email de transferencia enviado a ${recipient!.email}`);
    } catch (emailError) {
      console.error('❌ Error enviando email de transferencia:', emailError);
    }

    // 📱 Enviar WhatsApp (si el receptor tiene teléfono)
    const recipientWithPhone = await prisma.usuario.findUnique({
      where: { id: recipient!.id },
      select: { telefono: true }
    });

    if (recipientWithPhone?.telefono) {
      const whatsappMessage = `🎫 *¡Recibiste un Ticket!*

¡Hola ${recipient!.nombre}!

*${currentUser.nombre}* te transfirió un ticket para:
📍 *${ticket.organization?.name}*
🎯 *${updatedTicket?.vision.nombre || 'Visión'}*
📅 Fecha: ${visionDate}
🏆 Nivel: ${nivelesTexto}

🔐 *Tus credenciales:*
• Usuario: ${recipient!.email}
• Contraseña: Quantum123.

⚠️ Al entrar te pedirá cambiar tu contraseña.

👉 Ingresa aquí: ${loginUrl}

¡Te esperamos! 🚀`;

      try {
        await sendWhatsAppTextMessage(recipientWithPhone.telefono, whatsappMessage);
        console.log(`📱 WhatsApp de transferencia enviado a ${recipientWithPhone.telefono}`);
      } catch (whatsappError) {
        console.error('❌ Error enviando WhatsApp de transferencia:', whatsappError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${transferredTickets.length} ticket(s) transferido(s) exitosamente`,
      ticketsTransferred: transferredTickets.length,
      levels: transferredLevels,
      ticket: updatedTicket ? {
        id: updatedTicket.id,
        level: updatedTicket.level,
        newOwner: {
          name: updatedTicket.owner.nombre,
          email: updatedTicket.owner.email,
        },
        vision: {
          name: updatedTicket.vision.nombre,
          startDate: updatedTicket.vision.startDate,
        },
      } : null,
    });
  } catch (error) {
    console.error('Error executing transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Error al transferir ticket' },
      { status: 500 }
    );
  }
}
