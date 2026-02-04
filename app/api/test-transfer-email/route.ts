import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Este endpoint es solo para pruebas - eliminar después
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('email');
  
  if (!testEmail) {
    return NextResponse.json({ error: 'Email requerido como parámetro' }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.EMAIL_FROM || 'Quantum Matter <noreply@quantummatter.app>';

  // Obtener la URL de login de Oaxaca (org id 5)
  const oaxacaOrg = await prisma.organization.findUnique({
    where: { id: 5 },
    select: { customLoginUrl: true, name: true }
  });
  
  const loginUrl = oaxacaOrg?.customLoginUrl || 'https://quantummatter.app/oaxaca/login';
  
  if (!RESEND_API_KEY) {
    return NextResponse.json({ 
      success: false, 
      error: 'RESEND_API_KEY no configurado',
      hint: 'Agrega RESEND_API_KEY en las variables de entorno de Vercel (Production)'
    }, { status: 500 });
  }

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
                ¡Hola <strong style="color: #00B4D8;">Aldo Campos</strong>!
              </p>
              
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                <strong style="color: #333333;">Ricardo Yair Santiago Vargas</strong> te ha transferido un ticket para participar en el programa de transformación.
              </p>
              
              <!-- Ticket Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Organización:</span>
                          <span style="color: #1e293b; font-size: 16px; font-weight: 600; float: right;">Impacto Cuántico Oaxaca</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Visión:</span>
                          <span style="color: #1e293b; font-size: 16px; font-weight: 600; float: right;">VISIÓN 5</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Fecha de inicio:</span>
                          <span style="color: #00B4D8; font-size: 16px; font-weight: 600; float: right;">jueves, 6 de febrero de 2026</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #64748b; font-size: 14px;">Nivel(es):</span>
                          <span style="color: #10b981; font-size: 16px; font-weight: 600; float: right;">Básico</span>
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
                          <div style="color: #1e293b; font-size: 18px; font-weight: 700; font-family: monospace; background: #ffffff; padding: 12px; border-radius: 8px; margin-top: 5px; border: 1px solid #e2e8f0;">${testEmail}</div>
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
                Este ticket fue transferido por Ricardo Yair Santiago Vargas.<br>
                Si no esperabas este correo, puedes ignorarlo.<br><br>
                <strong style="color: #f59e0b;">⚠️ CORREO DE PRUEBA</strong>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>>
</html>
  `;

  try {
    // Usar Resend directamente como en automatizaciones
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: testEmail,
        subject: '🎫 [PRUEBA] ¡Ricardo Yair te transfirió un ticket para VISIÓN 5!',
        html: emailHtml
      })
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        message: `Correo de prueba enviado a ${testEmail}`,
        messageId: data.id 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: data.message || 'Error de Resend',
        details: data
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error enviando email de prueba:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al enviar correo' 
    }, { status: 500 });
  }
}
