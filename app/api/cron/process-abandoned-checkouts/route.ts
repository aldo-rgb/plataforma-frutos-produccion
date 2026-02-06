import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';
import logger from '@/lib/logger';

// Este endpoint procesa checkouts abandonados:
// 1. Encuentra registros IN_CHECKOUT con más de 30 minutos de antigüedad
// 2. Si el usuario no existe, lo crea con los datos guardados
// 3. Crea ticket PENDING_PAYMENT para el usuario
// 4. Envía email ofreciendo anticipo
// 5. Actualiza estado a EMAIL_SENT

export async function POST(request: Request) {
  try {
    // Verificar API key para seguridad (para cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Vercel Cron envía este header especial
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 30 minutos de espera antes de enviar el email de anticipo
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Buscar checkouts abandonados (más de 30 min en IN_CHECKOUT)
    const abandonedCheckouts = await prisma.abandonedCheckout.findMany({
      where: {
        status: 'IN_CHECKOUT',
        checkoutStartedAt: {
          lt: thirtyMinutesAgo,
        },
      },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
            website: true,
          },
        },
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    const results = {
      processed: 0,
      usersCreated: 0,
      ticketsCreated: 0,
      emailsSent: 0,
      whatsappSent: 0,
      errors: [] as string[],
    };

    for (const checkout of abandonedCheckouts) {
      try {
        // Get organization anticipos config
        const orgFull = await prisma.organization.findUnique({
          where: { id: checkout.organizationId },
        });
        
        const anticiposEnabled = orgFull?.anticiposEnabled;
        const anticipoAmount = orgFull?.anticipoAmount;
        
        // Si anticipos no están habilitados, solo marcar como abandonado
        if (!anticiposEnabled || !anticipoAmount) {
          await prisma.abandonedCheckout.update({
            where: { id: checkout.id },
            data: {
              status: 'ABANDONED',
              abandonedAt: new Date(),
            },
          });
          results.processed++;
          continue;
        }

        // Calcular deadline: 1 PM del primer día de la visión
        let paymentDeadline: Date | null = null;
        if (checkout.vision.startDate) {
          paymentDeadline = new Date(checkout.vision.startDate);
          paymentDeadline.setHours(13, 0, 0, 0); // 1 PM
        }

        // Verificar si el usuario existe o si necesitamos crearlo
        let userId = checkout.userId;
        let userName = checkout.user?.nombre || checkout.firstName || 'Participante';
        
        // Si no hay userId pero tenemos los datos de registro, crear el usuario
        if (!userId && (checkout as any).registrationData && (checkout as any).passwordHash) {
          const regData = (checkout as any).registrationData as any;
          
          // Verificar que no exista ya un usuario con ese email
          const existingUser = await prisma.usuario.findUnique({
            where: { email: checkout.email }
          });
          
          if (existingUser) {
            // Usuario ya existe, usar ese
            userId = existingUser.id;
            userName = existingUser.nombre;
            logger.debug(`✅ Usuario ya existía: ${checkout.email} (ID: ${userId})`);
          } else {
            // Crear el nuevo usuario
            const newUser = await prisma.usuario.create({
              data: {
                nombre: regData.nombre || `${checkout.firstName || ''} ${checkout.lastName || ''}`.trim(),
                apodo: regData.apodo || null,
                email: checkout.email,
                password: (checkout as any).passwordHash,
                telefono: checkout.phone || regData.telefono || null,
                horarioLlamada: regData.horarioLlamada || null,
                rol: 'PARTICIPANTE',
                organizationId: checkout.organizationId,
                profession: regData.profession || null,
                birthdate: regData.birthdate ? new Date(regData.birthdate) : null,
                children: regData.children || 0,
                goals: regData.goals || [],
                expectations: regData.expectations || null,
                referralCode: regData.referralCode || null,
                isActive: true,
                emailVerified: false,
              },
            });
            
            userId = newUser.id;
            userName = newUser.nombre;
            results.usersCreated++;
            logger.debug(`✅ Usuario creado desde checkout abandonado: ${checkout.email} (ID: ${userId})`);
            
            // Actualizar el checkout con el userId
            await prisma.abandonedCheckout.update({
              where: { id: checkout.id },
              data: { userId: userId },
            });
          }
        }

        // Crear ticket solo si tenemos userId
        let ticket = null;
        if (userId) {
          // Crear ticket PENDING_PAYMENT para el usuario
          ticket = await prisma.ticket.create({
            data: {
              ownerId: userId,
              organizationId: checkout.organizationId,
              visionId: checkout.visionId,
              level: 'BASIC',
              type: 'STANDARD',
              status: 'PENDING_PAYMENT',
              paymentStatus: 'UNPAID',
              isTransferable: false, // Anticipos no son transferibles
              isAnticipo: true,
              costAtPurchase: checkout.originalPrice,
              amountPaid: 0,
              validUntil: paymentDeadline,
            },
          });
          results.ticketsCreated++;
        }

        // Actualizar el checkout (con o sin ticket)
        await prisma.abandonedCheckout.update({
          where: { id: checkout.id },
          data: {
            status: 'EMAIL_SENT',
            abandonedAt: new Date(),
            emailSentAt: new Date(),
            ticketId: ticket?.id || null,
          },
        });

        // Enviar email ofreciendo anticipo
        const anticipoAmountNum = Number(anticipoAmount);
        const totalPrice = Number(checkout.originalPrice);
        const remaining = totalPrice - anticipoAmountNum;

        // URL directo a la página de pago de anticipo
        const ctaUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/checkout/anticipo?id=${checkout.id}`;
        const ctaText = 'COMPLETAR MI INSCRIPCIÓN';

        // Generar sección del logo si existe
        const logoSection = checkout.organization.logoUrl ? `
                <div style="margin-bottom: 16px;">
                  <img src="${checkout.organization.logoUrl}" alt="${checkout.organization.name}" style="max-height: 50px; max-width: 180px; object-fit: contain;" />
                </div>
        ` : '<div class="logo">🎓</div>';

        // Generar enlace al website si existe
        const websiteLink = checkout.organization.website ? `
                <p style="margin-top: 8px;">
                  <a href="${checkout.organization.website}" style="color: #818cf8; text-decoration: none; font-size: 12px;">
                    🌐 ${checkout.organization.website.replace('https://', '').replace('http://', '')}
                  </a>
                </p>
        ` : '';

        const emailHtml = `
          <!DOCTYPE html>>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; border: 1px solid #334155; }
              .header { text-align: center; margin-bottom: 24px; }
              .logo { font-size: 48px; margin-bottom: 16px; }
              h1 { color: #fbbf24; margin: 0; font-size: 24px; }
              .highlight-box { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
              .highlight-box h2 { color: #0f172a; margin: 0 0 8px 0; font-size: 20px; }
              .highlight-box .price { color: #0f172a; font-size: 36px; font-weight: bold; }
              .info-box { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; margin: 16px 0; }
              .info-box p { margin: 8px 0; color: #93c5fd; font-size: 14px; }
              .warning-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin: 16px 0; }
              .warning-box p { margin: 0; color: #fca5a5; font-size: 12px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #0f172a; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 24px 0; }
              .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                ${logoSection}
                <h1>¡No pierdas tu lugar!</h1>
              </div>
              
              <p style="color: #cbd5e1; line-height: 1.6;">
                Hola <strong>${userName}</strong>,
              </p>
              
              <p style="color: #cbd5e1; line-height: 1.6;">
                Notamos que no completaste tu inscripción a <strong>${checkout.vision.nombre}</strong>. 
                ¡Queremos ayudarte a reservar tu lugar!
              </p>
              
              <p style="color: #cbd5e1; line-height: 1.6;">
                <strong>Ya creamos tu cuenta</strong> con el correo <strong>${checkout.email}</strong>. 
                Solo necesitas iniciar sesión y completar tu pago.
              </p>

              <div class="highlight-box">
                <h2>💳 Reserva con solo</h2>
                <div class="price">$${anticipoAmountNum.toLocaleString()} MXN</div>
              </div>

              <div class="info-box">
                <p>📋 <strong>Precio total:</strong> $${totalPrice.toLocaleString()} MXN</p>
                <p>💰 <strong>Anticipo:</strong> $${anticipoAmountNum.toLocaleString()} MXN</p>
                <p>📅 <strong>Restante a pagar:</strong> $${remaining.toLocaleString()} MXN</p>
                <p>⏰ <strong>Deadline:</strong> 1:00 PM del primer día de la visión</p>
              </div>

              <div style="text-align: center;">
                <a href="${ctaUrl}" class="cta-button">
                  ${ctaText}
                </a>
              </div>

              <div class="warning-box">
                <p>⚠️ <strong>Importante:</strong> Los anticipos no son reembolsables ni transferibles. 
                Si no completas el pago antes de la 1:00 PM del primer día de la visión, perderás el anticipo.</p>
              </div>

              <div class="footer">
                <p>${checkout.organization.name}</p>
                ${websiteLink}
                <p>Este correo fue enviado porque iniciaste el proceso de inscripción.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          const emailResult = await sendEmail(
            checkout.email,
            `🎓 ¡Reserva tu lugar con solo $${anticipoAmountNum.toLocaleString()}! - ${checkout.vision.nombre}`,
            emailHtml
          );
          
          if (emailResult.success) {
            results.emailsSent++;
          } else {
            results.errors.push(`Checkout ${checkout.id}: ${emailResult.error}`);
          }
        } catch (emailError) {
          logger.error('Error sending email:', emailError);
          results.errors.push(`Checkout ${checkout.id}: Error enviando email`);
        }

        // Enviar WhatsApp si tiene número de teléfono
        if (checkout.phone) {
          try {
            const whatsappMessage = `🎓 ¡Hola ${userName}!

Notamos que no completaste tu inscripción a *${checkout.vision.nombre}*.

💳 *¡Reserva tu lugar con solo $${anticipoAmountNum.toLocaleString()} MXN!*

📋 Precio total: $${totalPrice.toLocaleString()} MXN
💰 Anticipo: $${anticipoAmountNum.toLocaleString()} MXN
📅 Restante: $${remaining.toLocaleString()} MXN

✅ Ya creamos tu cuenta con el correo *${checkout.email}*

👉 Inicia sesión y completa tu pago:
${ctaUrl}

⚠️ Los anticipos no son reembolsables. El pago restante debe completarse antes de la 1:00 PM del primer día de la visión.

- ${checkout.organization.name}`;

            const whatsappResult = await sendWhatsAppTextMessage(
              checkout.phone,
              whatsappMessage
            );
            
            if (whatsappResult.success) {
              results.whatsappSent++;
              logger.debug(`✅ WhatsApp enviado a ${checkout.phone}`);
            } else {
              logger.warn(`⚠️ WhatsApp no enviado: ${whatsappResult.error}`);
            }
          } catch (whatsappError) {
            logger.error('Error sending WhatsApp:', whatsappError);
            // No agregamos a errors porque WhatsApp es opcional
          }
        }

        results.processed++;
      } catch (checkoutError: any) {
        logger.error(`Error processing checkout ${checkout.id}:`, checkoutError);
        results.errors.push(`Checkout ${checkout.id}: ${checkoutError.message}`);
      }
    }

    logger.debug('📊 Resultados del procesamiento de checkouts abandonados:', results);

    return NextResponse.json({
      success: true,
      message: `Procesados ${results.processed} checkouts abandonados. Usuarios creados: ${results.usersCreated}. Tickets: ${results.ticketsCreated}. Emails: ${results.emailsSent}`,
      results,
    });
  } catch (error: any) {
    logger.error('Error processing abandoned checkouts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// GET - Procesar checkouts abandonados (llamado por Vercel Cron)
// También soporta ?stats=true para obtener solo estadísticas
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const statsOnly = url.searchParams.get('stats') === 'true';
    
    // Verificar autorización para Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Vercel Cron no envía Authorization header, pero sí un header especial
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Si solo quieren estadísticas
    if (statsOnly) {
      const stats = await prisma.abandonedCheckout.groupBy({
        by: ['status'],
        _count: true,
      });

      const pending = await prisma.abandonedCheckout.count({
        where: {
          status: 'IN_CHECKOUT',
          checkoutStartedAt: {
            lt: new Date(Date.now() - 30 * 60 * 1000),
          },
        },
      });

      return NextResponse.json({
        success: true,
        stats: stats.reduce((acc: Record<string, number>, s: any) => ({ ...acc, [s.status]: s._count }), {}),
        pendingToProcess: pending,
      });
    }

    // Procesar checkouts abandonados (misma lógica que POST)
    // Redirigir internamente al POST
    const postRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
    });
    
    return POST(postRequest);
  } catch (error: any) {
    logger.error('Error in GET handler:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
