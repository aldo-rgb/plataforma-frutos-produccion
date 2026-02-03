import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

/**
 * Cron Job: Video de Enrolamiento para Liderato
 * 
 * Este cron envía el video "Enrolamiento" (video motivacional para inscripción)
 * a las 11:30 PM del PRIMER DÍA de liderato de cada visión.
 * 
 * El primer día de liderato es `plWeekend1StartDate` en la tabla Vision.
 * 
 * Schedule: 30 5 * * * (todos los días a las 11:30 PM CST = 5:30 AM UTC del día siguiente)
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
    
    const results = {
      processed: 0,
      emailsSent: 0,
      whatsappSent: 0,
      errors: [] as string[],
      visionsChecked: 0,
    };

    console.log(`🎯 Ejecutando automatización de video Enrolamiento - ${now.toISOString()}`);

    // Calcular el día de HOY (en zona horaria CST)
    // El cron se ejecuta a las 5:30 AM UTC, que es 11:30 PM CST del día anterior
    // Por lo tanto, necesitamos verificar visiones cuyo plWeekend1StartDate sea HOY (el día anterior en UTC)
    const todayCST = new Date(now);
    todayCST.setHours(todayCST.getHours() - 6); // UTC - 6 = CST
    
    const todayStart = new Date(todayCST);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(todayCST);
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Buscando visiones con liderato que empezó HOY: ${todayStart.toDateString()}`);

    // Buscar visiones cuyo primer día de liderato (plWeekend1StartDate) es HOY
    const visions = await prisma.vision.findMany({
      where: {
        isActive: true,
        plWeekend1StartDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    results.visionsChecked = visions.length;
    console.log(`📋 Encontradas ${visions.length} visiones con liderato que empezó hoy`);

    for (const vision of visions) {
      if (!vision.organizationId) {
        console.log(`⚠️ Vision ${vision.nombre} sin organizationId`);
        continue;
      }

      // Obtener la organización con el video de enrolamiento
      const organization = await prisma.organization.findUnique({
        where: { id: vision.organizationId },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          videoEnrolamientoUrl: true,
          MasterOrganization: {
            select: { name: true }
          }
        }
      });

      if (!organization?.videoEnrolamientoUrl) {
        console.log(`⚠️ Vision ${vision.nombre} no tiene video de Enrolamiento configurado`);
        continue;
      }

      console.log(`\n🎬 Procesando video Enrolamiento para Vision: ${vision.nombre}`);

      // Obtener participantes de nivel PL (liderato) activos en esta visión
      const enrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: vision.id,
          level: 'PL',
          enrollmentStatus: { in: ['ACTIVE', 'ENROLLED'] },
        },
        select: {
          id: true,
          userId: true,
        }
      });

      console.log(`👥 Encontrados ${enrollments.length} participantes PL en ${vision.nombre}`);

      const senderName = organization?.MasterOrganization?.name || organization?.name || 'Tu Equipo';
      const orgName = organization?.name || 'Tu Equipo';
      const videoUrl = organization.videoEnrolamientoUrl;

      for (const enrollment of enrollments) {
        // Obtener el usuario
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

        const personalizedMessage = `¡Hola ${user.nombre}! 🚀

¡Felicitaciones por comenzar tu Liderato en ${vision.nombre}! 🎉

Te comparto un video muy especial sobre ENROLAMIENTO que te ayudará a multiplicar el impacto de tu transformación invitando a otros a vivir esta experiencia.

🎬 Ver video: ${videoUrl}

¡El mundo necesita más líderes como tú!
${orgName}`;

        // Enviar Email
        if (user.email) {
          try {
            const emailHtml = formatEnrollmentEmailHtml(
              user.nombre, 
              videoUrl, 
              vision.nombre, 
              orgName,
              organization.logoUrl
            );
            const emailResult = await sendEmail(
              user.email,
              `🚀 Enrolamiento - ¡Multiplica tu impacto! - ${orgName}`,
              emailHtml,
              { fromName: senderName }
            );

            if (emailResult.success) {
              results.emailsSent++;
              console.log(`📧 Email de Enrolamiento enviado a ${user.email}`);
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
              console.log(`📱 WhatsApp de Enrolamiento enviado a ${user.telefono}`);
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

    console.log('📊 Resultados:', results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      dateChecked: todayStart.toDateString(),
      results,
    });

  } catch (error: any) {
    console.error('❌ Error en automatización de Enrolamiento:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

function formatEnrollmentEmailHtml(
  nombre: string, 
  videoUrl: string, 
  visionName: string, 
  orgName: string,
  logoUrl: string | null
): string {
  const logoSection = logoUrl ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${logoUrl}" alt="${orgName}" style="max-width: 150px; max-height: 80px;">
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        ${logoSection}
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #06b6d4; font-size: 28px; margin: 0;">🚀 Enrolamiento</h1>
          <p style="color: #a855f7; font-size: 18px; margin-top: 10px;">Video motivacional para inscripción</p>
          <p style="color: #94a3b8; margin-top: 5px;">${visionName}</p>
        </div>
        
        <!-- Content -->
        <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 30px; border: 1px solid #334155;">
          
          <p style="color: #e2e8f0; font-size: 18px; margin: 0 0 20px 0;">
            ¡Hola <strong style="color: #06b6d4;">${nombre}</strong>! 🚀
          </p>
          
          <p style="color: #10b981; font-size: 16px; font-weight: bold; margin: 20px 0;">
            🎉 ¡Felicitaciones por comenzar tu Liderato!
          </p>
          
          <p style="color: #cbd5e1; margin: 12px 0; line-height: 1.6;">
            Este video especial te mostrará cómo puedes <strong style="color: #a855f7;">multiplicar el impacto de tu transformación</strong> invitando a otros a vivir esta experiencia que está cambiando tu vida.
          </p>
          
          <p style="color: #cbd5e1; margin: 12px 0; line-height: 1.6;">
            El enrolamiento no es solo invitar, es compartir algo que sabes que funciona. ¡Imagina el impacto que puedes tener en las personas que amas!
          </p>

          <!-- Key Benefits -->
          <div style="background: rgba(168, 85, 247, 0.1); border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #a855f7;">
            <p style="color: #e2e8f0; margin: 0 0 10px 0; font-weight: bold;">✨ Lo que aprenderás:</p>
            <p style="color: #cbd5e1; margin: 5px 0;">✅ Cómo compartir tu experiencia de manera auténtica</p>
            <p style="color: #cbd5e1; margin: 5px 0;">✅ Técnicas efectivas de invitación</p>
            <p style="color: #cbd5e1; margin: 5px 0;">✅ Cómo superar los miedos al invitar</p>
            <p style="color: #cbd5e1; margin: 5px 0;">✅ El poder de transformar vidas a través del ejemplo</p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${videoUrl}" style="display: inline-block; background: linear-gradient(135deg, #a855f7, #06b6d4); color: white; padding: 18px 50px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);">
              🎬 VER VIDEO DE ENROLAMIENTO
            </a>
          </div>
          
          <p style="color: #fcd34d; font-size: 16px; margin-top: 30px; text-align: center; font-weight: bold;">
            ¡El mundo necesita más líderes como tú! 🌟
          </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            ${orgName}
          </p>
          <p style="color: #475569; font-size: 12px; margin-top: 10px;">
            Este mensaje fue enviado automáticamente el primer día de tu Liderato
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
