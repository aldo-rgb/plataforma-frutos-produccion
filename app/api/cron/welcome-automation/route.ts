import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

/**
 * Cron Job: Automatizaciones de Bienvenida para Básico
 * 
 * Este cron se ejecuta diariamente a las 9:00 AM y:
 * 1. El VIERNES antes del inicio de básico → envía "Bienvenida Básico"
 * 2. El LUNES (día de inicio de básico) → envía "Bienvenida Básico 2"
 * 
 * Schedule: 0 15 * * * (todos los días a las 9 AM CST = 15 UTC)
 */

export async function GET(request: Request) {
  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const now = new Date();
    const todayDayOfWeek = now.getDay(); // 0=domingo, 1=lunes, 5=viernes
    
    const results = {
      processed: 0,
      emailsSent: 0,
      whatsappSent: 0,
      errors: [] as string[],
    };

    console.log(`🤖 Ejecutando automatización de bienvenida - Día: ${todayDayOfWeek} (${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][todayDayOfWeek]})`);

    // VIERNES (día 5): Enviar "Bienvenida Básico" para visiones que empiezan el LUNES siguiente
    if (todayDayOfWeek === 5) {
      console.log('📅 Es VIERNES - Buscando visiones que empiezan el lunes...');
      
      // Calcular el próximo lunes (3 días después del viernes)
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + 3);
      nextMonday.setHours(0, 0, 0, 0);
      
      const nextMondayEnd = new Date(nextMonday);
      nextMondayEnd.setHours(23, 59, 59, 999);

      // Buscar visiones que empiezan el lunes siguiente
      const visions = await prisma.vision.findMany({
        where: {
          isActive: true,
          startDate: {
            gte: nextMonday,
            lte: nextMondayEnd,
          },
        },
      });

      console.log(`📋 Encontradas ${visions.length} visiones que empiezan el lunes ${nextMonday.toDateString()}`);

      for (const vision of visions) {
        // Obtener la organización por separado
        if (!vision.organizationId) continue;
        
        const organization = await prisma.organization.findUnique({
          where: { id: vision.organizationId },
          select: {
            id: true,
            name: true,
            videoBienvenidaLideres1Url: true,
            MasterOrganization: {
              select: { name: true }
            }
          }
        });

        if (!organization?.videoBienvenidaLideres1Url) {
          console.log(`⚠️ Vision ${vision.nombre} no tiene video de Bienvenida Básico configurado`);
          continue;
        }

        await sendWelcomeMessages(
          vision,
          organization,
          'videoBienvenidaLideres1Url',
          'Bienvenida Básico',
          organization.videoBienvenidaLideres1Url,
          results
        );
      }
    }

    // LUNES (día 1): Enviar "Bienvenida Básico 2" para visiones que empiezan HOY
    if (todayDayOfWeek === 1) {
      console.log('📅 Es LUNES - Buscando visiones que empiezan hoy...');
      
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // Buscar visiones que empiezan hoy
      const visions = await prisma.vision.findMany({
        where: {
          isActive: true,
          startDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      console.log(`📋 Encontradas ${visions.length} visiones que empiezan hoy`);

      for (const vision of visions) {
        if (!vision.organizationId) continue;
        
        const organization = await prisma.organization.findUnique({
          where: { id: vision.organizationId },
          select: {
            id: true,
            name: true,
            videoBienvenidaLideres2Url: true,
            MasterOrganization: {
              select: { name: true }
            }
          }
        });

        if (!organization?.videoBienvenidaLideres2Url) {
          console.log(`⚠️ Vision ${vision.nombre} no tiene video de Bienvenida Básico 2 configurado`);
          continue;
        }

        await sendWelcomeMessages(
          vision,
          organization,
          'videoBienvenidaLideres2Url',
          'Bienvenida Básico 2',
          organization.videoBienvenidaLideres2Url,
          results
        );
      }
    }

    console.log('📊 Resultados:', results);

    return NextResponse.json({
      success: true,
      dayOfWeek: todayDayOfWeek,
      dayName: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][todayDayOfWeek],
      results,
    });

  } catch (error: any) {
    console.error('❌ Error en automatización de bienvenida:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

async function sendWelcomeMessages(
  vision: any,
  organization: any,
  videoKey: string,
  videoLabel: string,
  videoUrl: string,
  results: { processed: number; emailsSent: number; whatsappSent: number; errors: string[] }
) {
  console.log(`\n🎬 Procesando ${videoLabel} para Vision: ${vision.nombre}`);

  // Obtener todos los participantes de nivel BASIC de esta visión
  const enrollments = await prisma.vision_enrollments.findMany({
    where: {
      visionId: vision.id,
      level: 'BASIC',
      enrollmentStatus: { in: ['ACTIVE', 'ENROLLED'] },
    },
    select: {
      id: true,
      userId: true,
    }
  });

  console.log(`👥 Encontrados ${enrollments.length} participantes BASIC en ${vision.nombre}`);

  const senderName = organization?.MasterOrganization?.name || organization?.name || 'Tu Equipo';
  const orgName = organization?.name || 'Tu Equipo';

  for (const enrollment of enrollments) {
    // Obtener el usuario por separado
    const user = await prisma.usuario.findUnique({
      where: { id: enrollment.userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
      }
    });
    
    if (!user) continue;

    results.processed++;

    const personalizedMessage = `¡Hola ${user.nombre}! 🌟

Te compartimos un video especial de ${videoLabel} para tu programa ${vision.nombre}.

🎬 Ver video: ${videoUrl}

¡Nos vemos pronto!
${orgName}`;

    // Enviar Email
    if (user.email) {
      try {
        const emailHtml = formatWelcomeEmailHtml(user.nombre, videoLabel, videoUrl, vision.nombre, orgName);
        const emailResult = await sendEmail(
          user.email,
          `🎬 ${videoLabel} - ${orgName}`,
          emailHtml,
          { fromName: senderName }
        );

        if (emailResult.success) {
          results.emailsSent++;
          console.log(`📧 Email enviado a ${user.email}`);
        }
      } catch (err) {
        console.error(`❌ Error email a ${user.email}:`, err);
        results.errors.push(`Email fallido: ${user.email}`);
      }
    }

    // Enviar WhatsApp
    if (user.telefono) {
      try {
        const whatsappResult = await sendWhatsAppTextMessage(user.telefono, personalizedMessage);
        
        if (whatsappResult.success) {
          results.whatsappSent++;
          console.log(`📱 WhatsApp enviado a ${user.telefono}`);
        }
      } catch (err) {
        console.error(`❌ Error WhatsApp a ${user.telefono}:`, err);
        results.errors.push(`WhatsApp fallido: ${user.telefono}`);
      }
    }

    // Pequeña pausa para no saturar los servicios
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

function formatWelcomeEmailHtml(nombre: string, videoLabel: string, videoUrl: string, visionName: string, orgName: string): string {
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
          <h1 style="color: #06b6d4; font-size: 28px; margin: 0;">🎬 ${videoLabel}</h1>
          <p style="color: #94a3b8; margin-top: 10px;">${visionName}</p>
        </div>
        
        <!-- Content -->
        <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 30px; border: 1px solid #334155;">
          
          <p style="color: #e2e8f0; font-size: 18px; margin: 0 0 20px 0;">
            ¡Hola <strong style="color: #06b6d4;">${nombre}</strong>! 🌟
          </p>
          
          <p style="color: #cbd5e1; margin: 12px 0; line-height: 1.6;">
            Te compartimos un video especial para prepararte para tu programa <strong>${visionName}</strong>.
          </p>
          
          <p style="color: #cbd5e1; margin: 12px 0; line-height: 1.6;">
            Este video contiene información importante que te ayudará a aprovechar al máximo esta experiencia transformadora.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${videoUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 18px 50px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);">
              🎬 VER VIDEO AHORA
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
            ¡Nos vemos pronto! 🚀
          </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            ${orgName}
          </p>
          <p style="color: #475569; font-size: 12px; margin-top: 10px;">
            Este mensaje fue enviado automáticamente
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// También permitir POST para pruebas manuales
export async function POST(request: Request) {
  return GET(request);
}
