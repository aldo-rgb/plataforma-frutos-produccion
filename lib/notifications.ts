import prisma from './prisma';

/**
 * Sistema de Notificaciones para Carta F.R.U.T.O.S.
 * 
 * TODO: Configurar servicio de email (Resend, SendGrid, Nodemailer)
 * TODO: Configurar notificaciones push (OneSignal, Firebase)
 */

interface NotificationPayload {
  userId: number;
  title: string;
  message: string;
  type: 'carta_submitted' | 'changes_requested' | 'carta_approved';
  metadata?: any;
}

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

async function sendEmail(to: string, subject: string, htmlContent: string) {
  console.log(`📧 [EMAIL] To: ${to}`);
  console.log(`📧 [EMAIL] Subject: ${subject}`);
  console.log(`📧 [EMAIL] Content: ${htmlContent}`);
  
  // TODO: Integrar servicio de email
  /*
  // Ejemplo con Resend:
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'Plataforma F.R.U.T.O.S. <noreply@frutos.com>',
    to: [to],
    subject: subject,
    html: htmlContent,
  });
  */
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

async function sendPushNotification(userId: number, title: string, body: string) {
  console.log(`🔔 [PUSH] UserId: ${userId}`);
  console.log(`🔔 [PUSH] Title: ${title}`);
  console.log(`🔔 [PUSH] Body: ${body}`);
  
  // TODO: Integrar OneSignal o Firebase Cloud Messaging
  /*
  // Ejemplo con OneSignal:
  const notification = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_external_user_ids: [userId.toString()],
    headings: { en: title },
    contents: { en: body },
    url: `${process.env.NEXT_PUBLIC_URL}/dashboard/carta/wizard`
  };
  
  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify(notification)
  });
  */
}

// ============================================
// CARTA SUBMITTED (Usuario → Mentor/Admin)
// ============================================

export async function notifyCartaSubmitted(userId: number, mentorId?: number) {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, email: true }
    });

    if (!user) throw new Error('Usuario no encontrado');

    if (mentorId) {
      // Notificar al mentor
      const mentor = await prisma.usuario.findUnique({
        where: { id: mentorId },
        select: { nombre: true, email: true }
      });

      if (mentor) {
        await sendEmail(
          mentor.email,
          '📬 Nueva Carta F.R.U.T.O.S. para Revisar',
          `
            <h2>¡Hola ${mentor.nombre}!</h2>
            <p><strong>${user.nombre}</strong> ha enviado su Carta F.R.U.T.O.S. para tu revisión.</p>
            <p>Por favor, revisa y proporciona feedback:</p>
            <a href="${process.env.NEXT_PUBLIC_URL}/dashboard/mentor" style="display: inline-block; padding: 12px 24px; background: #9333ea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Ver Carta
            </a>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              Recuerda: Proporciona feedback específico, constructivo y motivador. 💪
            </p>
          `
        );

        await sendPushNotification(
          mentorId,
          'Nueva Carta para Revisar',
          `${user.nombre} envió su carta F.R.U.T.O.S.`
        );
      }
    } else {
      // Notificar a admin (fallback)
      console.log('📧 Notificando a ADMIN: Nueva carta sin mentor asignado');
      // TODO: Enviar email a admin@frutos.com
    }

    // Confirmar al usuario
    await sendEmail(
      user.email,
      '✅ Carta Enviada para Revisión',
      `
        <h2>¡Excelente trabajo, ${user.nombre}!</h2>
        <p>Tu Carta F.R.U.T.O.S. ha sido enviada correctamente.</p>
        <p>Tu mentor la revisará pronto y recibirás notificación cuando esté lista.</p>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          💡 Consejo: Mientras esperas, familiarízate con el calendario y prepárate para los 100 días de transformación.
        </p>
      `
    );

  } catch (error) {
    console.error('❌ Error sending submission notification:', error);
  }
}

// ============================================
// CHANGES REQUESTED (Mentor → Usuario)
// ============================================

export async function notifyChangesRequested(userId: number, feedbackSummary: string) {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, email: true }
    });

    if (!user) throw new Error('Usuario no encontrado');

    await sendEmail(
      user.email,
      '🔄 Ajustes Solicitados en tu Carta F.R.U.T.O.S.',
      `
        <h2>¡Hola ${user.nombre}!</h2>
        <p>Tu mentor revisó tu carta y sugiere algunos ajustes para maximizar tu éxito:</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Feedback del Mentor:</strong>
          <pre style="white-space: pre-wrap; margin-top: 8px;">${feedbackSummary}</pre>
        </div>
        <p>No te desanimes, esto es parte del proceso de refinamiento. ¡Estás cada vez más cerca!</p>
        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard/carta/corrections" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Ver Correcciones
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Tip: Los campos en rojo necesitan cambios. Los verdes ya están aprobados. 💪
        </p>
      `
    );

    await sendPushNotification(
      userId,
      'Ajustes en tu Carta',
      'Tu mentor revisó tu carta y sugiere mejoras'
    );

  } catch (error) {
    console.error('❌ Error sending changes notification:', error);
  }
}

// ============================================
// CARTA APPROVED (Mentor → Usuario)
// ============================================

export async function notifyCartaApproved(userId: number, tasksCreated: number) {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, email: true }
    });

    if (!user) throw new Error('Usuario no encontrado');

    await sendEmail(
      user.email,
      '🎉 ¡Tu Carta F.R.U.T.O.S. está APROBADA!',
      `
        <h2>¡FELICIDADES, ${user.nombre}! 🎉🎉🎉</h2>
        <p>Tu Carta F.R.U.T.O.S. ha sido <strong>APROBADA</strong> por tu mentor.</p>
        
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px; color: white; text-align: center; margin: 24px 0;">
          <h3 style="margin: 0 0 8px 0; font-size: 32px;">💥 ${tasksCreated} TAREAS</h3>
          <p style="margin: 0; font-size: 18px;">han sido generadas automáticamente</p>
        </div>

        <p><strong>¿Qué sigue ahora?</strong></p>
        <ol style="line-height: 1.8;">
          <li>Tus <strong>${tasksCreated} tareas</strong> ya están en tu calendario</li>
          <li>Cada día verás las acciones que debes completar</li>
          <li>Sube evidencias fotográficas de cada tarea</li>
          <li>Completa el programa de <strong>100 días</strong></li>
          <li>Transforma tu vida con F.R.U.T.O.S. 🍊</li>
        </ol>

        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; margin-top: 16px;">
          Ver Mi Dashboard
        </a>

        <p style="margin-top: 32px; padding: 16px; background: #f3f4f6; border-left: 4px solid #9333ea; font-style: italic;">
          "El éxito es la suma de pequeños esfuerzos repetidos día tras día." <br>
          - Robert Collier
        </p>

        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          💪 Recuerda: La consistencia es clave. No se trata de ser perfecto, sino de ser constante.
        </p>
      `
    );

    await sendPushNotification(
      userId,
      '🎉 Carta Aprobada',
      `${tasksCreated} tareas generadas. ¡Comienza tu transformación!`
    );

  } catch (error) {
    console.error('❌ Error sending approval notification:', error);
  }
}

// ============================================
// EVIDENCIA RECHAZADA (Mentor → Usuario)
// ============================================

export async function notifyEvidenciaRechazada(
  userId: number, 
  taskTitle: string, 
  feedback: string,
  taskType: 'CARTA' | 'EXTRAORDINARY' | 'EVENT'
) {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, email: true }
    });

    if (!user) throw new Error('Usuario no encontrado');

    const taskTypeLabel = taskType === 'EXTRAORDINARY' 
      ? 'Misión Extraordinaria' 
      : taskType === 'EVENT' 
      ? 'Evento Especial' 
      : 'Tarea del Wizard';

    await sendEmail(
      user.email,
      '🔄 Evidencia Rechazada - Acción Requerida',
      `
        <h2>Hola ${user.nombre},</h2>
        <p>Tu mentor ha revisado la evidencia que enviaste y necesita que realices algunos ajustes.</p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #92400e; margin: 0 0 8px 0;">📋 Tarea: ${taskTitle}</h3>
          <p style="color: #78350f; margin: 0; font-size: 14px;">${taskTypeLabel}</p>
        </div>

        <h3 style="color: #dc2626;">❌ Motivo del Rechazo:</h3>
        <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="color: #991b1b; margin: 0; font-size: 16px;">${feedback}</p>
        </div>

        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #1e40af; margin: 0 0 8px 0;">💡 ¿Qué hacer ahora?</h3>
          <ol style="color: #1e3a8a; margin: 8px 0; padding-left: 20px; line-height: 1.8;">
            <li>Lee el feedback de tu mentor cuidadosamente</li>
            <li>Realiza los ajustes necesarios</li>
            <li>Sube una nueva evidencia que cumpla con los requisitos</li>
            <li>Tu mentor la revisará nuevamente</li>
          </ol>
        </div>

        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard/hoy" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; margin-top: 16px;">
          🔄 Subir Nueva Evidencia
        </a>

        <p style="margin-top: 32px; padding: 16px; background: #f3f4f6; border-left: 4px solid #f59e0b; font-style: italic;">
          💪 No te desanimes. Cada intento te acerca más a tu meta. ¡Ajusta y vuelve a intentarlo!
        </p>

        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          ⚡ Recuerda: Tu mentor está aquí para ayudarte a mejorar, no para detenerte.
        </p>
      `
    );

    await sendPushNotification(
      userId,
      '🔄 Evidencia Rechazada',
      `${taskTitle} - Por favor sube una nueva evidencia`
    );

    console.log(`✅ Notificación de rechazo enviada a usuario ${userId} para tarea: ${taskTitle}`);

  } catch (error) {
    console.error('❌ Error sending rejection notification:', error);
  }
}

// ============================================
// GENERIC NOTIFICATION (In-App)
// ============================================

export async function createInAppNotification(payload: NotificationPayload) {
  try {
    // TODO: Crear tabla Notification en Prisma schema
    /*
    await prisma.notification.create({
      data: {
        usuarioId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        metadata: payload.metadata,
        read: false,
        createdAt: new Date()
      }
    });
    */
    console.log(`📬 [IN-APP] Notification created for user ${payload.userId}`);
  } catch (error) {
    console.error('❌ Error creating in-app notification:', error);
  }
}
