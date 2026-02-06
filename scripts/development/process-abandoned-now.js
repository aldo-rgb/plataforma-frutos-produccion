const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Función simple para enviar email via Resend
async function sendEmail(to, subject, html) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@quantummatter.app';

  if (!RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY no configurado');
    return { success: false, error: 'No API key' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: html
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.log('❌ Error Resend:', data);
      return { success: false, error: data.message };
    }
    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function processAbandoned() {
  console.log("\n🔄 PROCESANDO CHECKOUTS ABANDONADOS...\n");

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
        select: { id: true, nombre: true, startDate: true },
      },
      organization: {
        select: { 
          id: true, 
          name: true, 
          anticiposEnabled: true,
          anticipoAmount: true,
          MasterOrganization: { select: { name: true } }
        },
      },
      user: {
        select: { id: true, nombre: true, email: true },
      },
    },
  });

  console.log(`📋 Encontrados ${abandonedCheckouts.length} checkouts abandonados\n`);

  let emailsSent = 0;
  let errors = 0;

  for (const checkout of abandonedCheckouts) {
    console.log(`\n--- Procesando: ${checkout.email} ---`);
    
    const org = checkout.organization;
    
    // Si anticipos no están habilitados, marcar como abandonado
    if (!org.anticiposEnabled || !org.anticipoAmount) {
      console.log('⚠️ Anticipos no habilitados, marcando como ABANDONED');
      await prisma.abandonedCheckout.update({
        where: { id: checkout.id },
        data: { status: 'ABANDONED', abandonedAt: new Date() },
      });
      continue;
    }

    const userName = checkout.user?.nombre || checkout.firstName || 'Participante';
    const anticipoAmount = Number(org.anticipoAmount);
    const totalPrice = Number(checkout.originalPrice);
    const remaining = totalPrice - anticipoAmount;
    const senderName = org.MasterOrganization?.name || org.name;

    // Email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; }
          h1 { color: #fbbf24; text-align: center; }
          .highlight { background: #fbbf24; color: #0f172a; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .highlight .price { font-size: 36px; font-weight: bold; }
          .info { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 16px; border-radius: 12px; margin: 16px 0; }
          .cta { display: inline-block; background: #fbbf24; color: #0f172a; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; }
          .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎓 ¡No pierdas tu lugar!</h1>
          
          <p>Hola <strong>${userName}</strong>,</p>
          
          <p>Notamos que no completaste tu inscripción a <strong>${checkout.vision?.nombre || 'la visión'}</strong>.</p>
          
          <div class="highlight">
            <p>💳 Reserva con solo</p>
            <div class="price">$${anticipoAmount.toLocaleString()} MXN</div>
          </div>

          <div class="info">
            <p>📋 Precio total: $${totalPrice.toLocaleString()} MXN</p>
            <p>💰 Anticipo: $${anticipoAmount.toLocaleString()} MXN</p>
            <p>📅 Restante: $${remaining.toLocaleString()} MXN</p>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.NEXTAUTH_URL || 'https://quantummatter.app'}/checkout/${checkout.organization.id}/${checkout.visionId}" class="cta">
              COMPLETAR MI INSCRIPCIÓN
            </a>
          </p>

          <div class="footer">
            <p>${senderName}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email
    const result = await sendEmail(
      checkout.email,
      `🎓 ¡Reserva tu lugar con anticipo! - ${org.name}`,
      emailHtml
    );

    if (result.success) {
      console.log(`✅ Email enviado a ${checkout.email}`);
      emailsSent++;
      
      // Actualizar status
      await prisma.abandonedCheckout.update({
        where: { id: checkout.id },
        data: {
          status: 'EMAIL_SENT',
          abandonedAt: new Date(),
          emailSentAt: new Date(),
        },
      });
    } else {
      console.log(`❌ Error enviando a ${checkout.email}: ${result.error}`);
      errors++;
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`📧 Emails enviados: ${emailsSent}`);
  console.log(`❌ Errores: ${errors}`);
  
  await prisma.$disconnect();
}

// Cargar variables de entorno
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

processAbandoned();
