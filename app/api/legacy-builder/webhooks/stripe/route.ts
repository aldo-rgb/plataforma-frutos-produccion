import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LEGACY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Manejar eventos de pago completado
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Verificar que es una donación de Legacy Builder
      if (session.metadata?.type !== 'legacy_donation') {
        return NextResponse.json({ received: true });
      }

      const donationId = parseInt(session.metadata.donationId);
      const campaignId = parseInt(session.metadata.campaignId);

      // Actualizar donación
      const donation = await prisma.legacyDonation.update({
        where: { id: donationId },
        data: {
          paymentStatus: 'COMPLETED',
          moneyStatus: 'COLLECTED'
        },
        include: {
          campaign: {
            include: {
              project: true
            }
          }
        }
      });

      // Actualizar montos de la campaña y proyecto
      await prisma.$transaction([
        // Actualizar campaña
        prisma.legacyCampaign.update({
          where: { id: campaignId },
          data: {
            raisedAmount: { increment: donation.amount },
            availableAmount: { increment: donation.amount }
          }
        }),
        // Actualizar proyecto padre
        prisma.legacyProject.update({
          where: { id: donation.campaign.projectId },
          data: {
            raisedAmount: { increment: donation.amount }
          }
        })
      ]);

      // Actualizar stats del referidor si existe
      if (donation.referredById) {
        await prisma.legacyCampaignMember.update({
          where: { id: donation.referredById },
          data: {
            totalRaised: { increment: donation.amount },
            donationsCount: { increment: 1 }
          }
        });
      }

      // Enviar email de agradecimiento al donador
      const amountFormatted = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(Number(donation.amount));

      await sendEmail(
        donation.donorEmail,
        `¡Gracias por tu donación a ${donation.campaign.title}!`,
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">¡Gracias por tu generosidad! 💚</h1>
            </div>
            
            <div style="background: #1e293b; padding: 40px 30px; border-radius: 0 0 16px 16px;">
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Hola ${donation.donorName || 'Amigo/a'},
              </p>
              
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
                Tu donación de <strong style="color: #10b981;">${amountFormatted}</strong> ha sido recibida exitosamente.
              </p>
              
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; margin: 25px 0;">
                <p style="color: #10b981; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">
                  Detalles de tu donación:
                </p>
                <p style="color: #e2e8f0; margin: 5px 0;">Campaña: ${donation.campaign.title}</p>
                <p style="color: #e2e8f0; margin: 5px 0;">Proyecto: ${donation.campaign.project.title}</p>
                <p style="color: #e2e8f0; margin: 5px 0;">Monto: ${amountFormatted}</p>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Tu aportación está siendo administrada de forma transparente. Podrás ver exactamente cómo se utiliza tu dinero en la sección de transparencia de la campaña.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/legado/${donation.campaign.slug}" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-weight: bold;">
                  Ver Transparencia
                </a>
              </div>
            </div>
            
            <div style="text-align: center; padding-top: 20px;">
              <p style="color: #64748b; font-size: 12px;">
                Gracias por ser parte del cambio 🙏
              </p>
            </div>
          </div>
        </body>
        </html>
        `
      );

      console.log(`✅ Donation ${donationId} completed: ${amountFormatted}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
