import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTextMessage, sendAppointmentConfirmation } from '@/lib/whatsapp';
import prisma from '@/lib/prisma';

// Función para parsear fecha en español a Date
function parseSpanishDate(dateStr: string, timeStr: string): Date {
  // dateStr viene como "viernes, 21 de marzo"
  const months: { [key: string]: number } = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  
  const match = dateStr.match(/(\d+)\s+de\s+(\w+)/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = months[monthName] ?? new Date().getMonth();
    const year = new Date().getFullYear();
    
    // Parsear hora (ej: "10:00")
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    return new Date(year, month, day, hours, minutes);
  }
  
  return new Date();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      phoneNumber, 
      businessName,
      businessPhone,
      serviceName, 
      serviceDescription,
      serviceDuration,
      servicePrice,
      date, 
      time,
      customerName,
      customerPhone,
      useTemplate = true
    } = body;

    if (!phoneNumber || !serviceName || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const targetPhone = businessPhone || phoneNumber;
    const priceStr = servicePrice === 0 || servicePrice === '0' ? 'Solicitar Cotización' : `$${servicePrice} MXN`;
    
    const results = {
      business: { success: false, messageId: null as string | null },
      customer: { success: false, messageId: null as string | null },
      saved: false
    };
    
    // ============================================
    // GUARDAR CITA EN BASE DE DATOS
    // ============================================
    try {
      const appointmentDateTime = parseSpanishDate(date, time);
      
      await prisma.quantumAppointment.create({
        data: {
          businessName: businessName || 'Sin nombre',
          businessPhone: targetPhone,
          serviceName,
          servicePrice: servicePrice || 0,
          serviceDuration: parseInt(serviceDuration) || 60,
          appointmentDate: appointmentDateTime,
          appointmentTime: time,
          customerName: customerName || null,
          customerPhone: customerPhone || '',
          status: 'pending',
          confirmationSent: true
        }
      });
      results.saved = true;
      console.log('✅ Cita guardada en BD para recordatorio');
    } catch (dbError) {
      console.error('❌ Error guardando cita:', dbError);
    }
    
    // ============================================
    // 1. ENVIAR AL VENDEDOR/NEGOCIO
    // ============================================
    if (useTemplate) {
      const businessResult = await sendAppointmentConfirmation(
        targetPhone,
        businessName || 'Tu Negocio',
        serviceName,
        serviceDuration?.toString() || '60',
        priceStr,
        date,
        time
      );
      results.business = { success: businessResult.success, messageId: businessResult.messageId || null };
    }
    
    // Fallback a mensaje de texto si falla plantilla
    if (!results.business.success) {
      const businessMessage = `📅 *NUEVA SOLICITUD DE CITA*

🏢 *${businessName || 'Tu Negocio'}*

━━━━━━━━━━━━━━━━━━━━
📋 *Servicio:* ${serviceName}
${serviceDescription ? `📝 *Descripción:* ${serviceDescription}` : ''}
⏱️ *Duración:* ${serviceDuration || '60'} min
💰 *Precio:* ${priceStr}
━━━━━━━━━━━━━━━━━━━━

📆 *Fecha:* ${date}
🕐 *Hora:* ${time}

👤 *Cliente:* ${customerName || 'No proporcionado'}
📱 *Teléfono:* ${customerPhone || 'No proporcionado'}

━━━━━━━━━━━━━━━━━━━━
_Responde para confirmar la cita_`;

      const textResult = await sendWhatsAppTextMessage(targetPhone, businessMessage);
      results.business = { success: textResult.success, messageId: textResult.messageId || null };
    }
    
    // ============================================
    // 2. ENVIAR AL CLIENTE (Confirmación)
    // ============================================
    if (customerPhone) {
      const customerMessage = `✅ *CITA SOLICITADA*

Hola${customerName ? ` ${customerName}` : ''},

Tu solicitud de cita ha sido enviada a *${businessName || 'el negocio'}*.

━━━━━━━━━━━━━━━━━━━━
📋 *Servicio:* ${serviceName}
📆 *Fecha:* ${date}
🕐 *Hora:* ${time}
💰 *Precio:* ${priceStr}
━━━━━━━━━━━━━━━━━━━━

⏰ Te enviaremos un recordatorio 24 horas antes.

Te contactarán pronto para confirmar. ¡Gracias por tu preferencia! 🙏`;

      const customerResult = await sendWhatsAppTextMessage(customerPhone, customerMessage);
      results.customer = { success: customerResult.success, messageId: customerResult.messageId || null };
    }

    // Responder con resultados
    if (results.business.success || results.customer.success) {
      return NextResponse.json({
        success: true,
        results,
        message: 'Solicitud de cita enviada correctamente'
      });
    } else {
      const fallbackMessage = `Hola, me gustaría agendar una cita:\n\n📋 Servicio: ${serviceName}\n📅 Fecha: ${date}\n🕐 Hora: ${time}\n💰 Precio: ${priceStr}`;
      return NextResponse.json({
        success: false,
        error: 'No se pudo enviar el mensaje',
        fallbackUrl: `https://wa.me/${targetPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(fallbackMessage)}`
      });
    }

  } catch (error: any) {
    console.error('Error enviando cita por WhatsApp:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
