import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppTextMessage, sendAppointmentReminder } from '@/lib/whatsapp';

/**
 * Cron Job: Recordatorio de Citas 24 horas antes
 * Ejecutar cada hora o cada 30 minutos
 * Vercel Cron: 0 * * * * (cada hora)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticación para cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Permitir en desarrollo
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();
    
    // Buscar citas que son en las próximas 24-25 horas y no se ha enviado recordatorio
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    const appointmentsToRemind = await prisma.quantumAppointment.findMany({
      where: {
        appointmentDate: {
          gte: in24Hours,
          lte: in25Hours
        },
        reminderSent: false,
        status: {
          in: ['pending', 'confirmed']
        }
      }
    });

    console.log(`⏰ Encontradas ${appointmentsToRemind.length} citas para recordatorio`);

    const results = {
      total: appointmentsToRemind.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const appointment of appointmentsToRemind) {
      try {
        // Formatear fecha para el mensaje
        const dateStr = appointment.appointmentDate.toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });

        // Intentar con plantilla primero
        let success = false;
        
        const templateResult = await sendAppointmentReminder(
          appointment.customerPhone,
          appointment.customerName || 'Cliente',
          appointment.businessName,
          appointment.serviceName,
          dateStr,
          appointment.appointmentTime
        );
        
        if (templateResult.success) {
          success = true;
        } else {
          // Fallback a mensaje de texto
          const reminderMessage = `⏰ *RECORDATORIO DE CITA*

Hola${appointment.customerName ? ` ${appointment.customerName}` : ''},

Te recordamos tu cita en *${appointment.businessName}*:

━━━━━━━━━━━━━━━━━━━━
📋 *Servicio:* ${appointment.serviceName}
📆 *Fecha:* ${dateStr}
🕐 *Hora:* ${appointment.appointmentTime}
━━━━━━━━━━━━━━━━━━━━

¡Te esperamos! Si necesitas cancelar o reagendar, responde a este mensaje.`;

          const textResult = await sendWhatsAppTextMessage(appointment.customerPhone, reminderMessage);
          success = textResult.success;
        }

        if (success) {
          // Marcar como enviado
          await prisma.quantumAppointment.update({
            where: { id: appointment.id },
            data: { reminderSent: true }
          });
          results.sent++;
          console.log(`✅ Recordatorio enviado a ${appointment.customerPhone}`);
        } else {
          results.failed++;
          results.errors.push(`Error enviando a ${appointment.customerPhone}`);
        }

      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error con cita ${appointment.id}: ${error.message}`);
        console.error(`❌ Error enviando recordatorio:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recordatorios procesados: ${results.sent} enviados, ${results.failed} fallidos`,
      results
    });

  } catch (error: any) {
    console.error('Error en cron de recordatorios:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
