import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// Este endpoint procesa checkouts abandonados:
// 1. Encuentra registros IN_CHECKOUT con más de 5 minutos
// 2. Crea ticket PENDING_PAYMENT para el usuario
// 3. Envía email ofreciendo anticipo
// 4. Actualiza estado a EMAIL_SENT

export async function POST(request: Request) {
  try {
    // Verificar API key para seguridad (para cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Buscar checkouts abandonados (más de 5 min en IN_CHECKOUT)
    const abandonedCheckouts = await prisma.abandonedCheckout.findMany({
      where: {
        status: 'IN_CHECKOUT',
        checkoutStartedAt: {
          lt: fiveMinutesAgo,
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
      ticketsCreated: 0,
      emailsSent: 0,
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

        // Verificar que el usuario exista
        if (!checkout.userId || !checkout.user) {
          results.errors.push(`Checkout ${checkout.id}: Usuario no encontrado`);
          continue;
        }

        // Crear ticket PENDING_PAYMENT para el usuario
        const ticket = await prisma.ticket.create({
          data: {
            ownerId: checkout.userId,
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

        // Actualizar el checkout con el ticket creado
        await prisma.abandonedCheckout.update({
          where: { id: checkout.id },
          data: {
            status: 'EMAIL_SENT',
            abandonedAt: new Date(),
            emailSentAt: new Date(),
            ticketId: ticket.id,
          },
        });

        // Enviar email ofreciendo anticipo
        const anticipoAmountNum = Number(anticipoAmount);
        const totalPrice = Number(checkout.originalPrice);
        const remaining = totalPrice - anticipoAmountNum;

        const emailHtml = `
          <!DOCTYPE html>
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
                <div class="logo">🎓</div>
                <h1>¡No pierdas tu lugar!</h1>
              </div>
              
              <p style="color: #cbd5e1; line-height: 1.6;">
                Hola <strong>${checkout.firstName || checkout.user?.nombre || 'Participante'}</strong>,
              </p>
              
              <p style="color: #cbd5e1; line-height: 1.6;">
                Notamos que no completaste tu inscripción a <strong>${checkout.vision.nombre}</strong>. 
                ¡Queremos ayudarte a reservar tu lugar!
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
                <a href="${process.env.NEXTAUTH_URL}/dashboard/my-tickets" class="cta-button">
                  Ver Mi Ticket y Pagar
                </a>
              </div>

              <div class="warning-box">
                <p>⚠️ <strong>Importante:</strong> Los anticipos no son reembolsables ni transferibles. 
                Si no completas el pago antes de la 1:00 PM del primer día de la visión, perderás el anticipo.</p>
              </div>

              <div class="footer">
                <p>${checkout.organization.name}</p>
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
          console.error('Error sending email:', emailError);
          results.errors.push(`Checkout ${checkout.id}: Error enviando email`);
        }

        results.processed++;
      } catch (checkoutError: any) {
        console.error(`Error processing checkout ${checkout.id}:`, checkoutError);
        results.errors.push(`Checkout ${checkout.id}: ${checkoutError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Procesados ${results.processed} checkouts abandonados`,
      results,
    });
  } catch (error: any) {
    console.error('Error processing abandoned checkouts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// GET - Obtener estadísticas de checkouts abandonados
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const stats = await prisma.abandonedCheckout.groupBy({
      by: ['status'],
      _count: true,
    });

    const pending = await prisma.abandonedCheckout.count({
      where: {
        status: 'IN_CHECKOUT',
        checkoutStartedAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
    });

    return NextResponse.json({
      success: true,
      stats: stats.reduce((acc: Record<string, number>, s: any) => ({ ...acc, [s.status]: s._count }), {}),
      pendingToProcess: pending,
    });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
