import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

// Este endpoint es solo para pruebas - eliminar después
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('email');
  
  if (!testEmail) {
    return NextResponse.json({ error: 'Email requerido como parámetro' }, { status: 400 });
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Recibiste un Ticket!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0a0f1a 0%, #1a1f2e 100%); padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: rgba(15, 23, 42, 0.95); border-radius: 20px; border: 2px solid rgba(0, 240, 255, 0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 153, 204, 0.2) 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(0, 240, 255, 0.2);">
              <h1 style="margin: 0; color: #00F0FF; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">
                🎫 ¡Recibiste un Ticket!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #e2e8f0; font-size: 18px; margin: 0 0 20px 0;">
                ¡Hola <strong style="color: #00F0FF;">Aldo Campos</strong>!
              </p>
              
              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                <strong style="color: #ffffff;">Ricardo Yair Santiago Vargas</strong> te ha transferido un ticket para participar en el programa de transformación.
              </p>
              
              <!-- Ticket Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(0, 240, 255, 0.1);">
                          <span style="color: #64748b; font-size: 14px;">Organización:</span>
                          <span style="color: #ffffff; font-size: 16px; font-weight: 600; float: right;">Impacto Cuántico Oaxaca</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(0, 240, 255, 0.1);">
                          <span style="color: #64748b; font-size: 14px;">Visión:</span>
                          <span style="color: #ffffff; font-size: 16px; font-weight: 600; float: right;">VISIÓN 5</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(0, 240, 255, 0.1);">
                          <span style="color: #64748b; font-size: 14px;">Fecha de inicio:</span>
                          <span style="color: #00F0FF; font-size: 16px; font-weight: 600; float: right;">jueves, 6 de febrero de 2026</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 14px;">Nivel(es):</span>
                          <span style="color: #10b981; font-size: 16px; font-weight: 600; float: right;">Básico</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px;">🔐 Tus credenciales de acceso:</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #94a3b8; font-size: 14px;">Usuario (email):</span>
                          <div style="color: #ffffff; font-size: 18px; font-weight: 700; font-family: monospace; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-top: 5px;">${testEmail}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #94a3b8; font-size: 14px;">Contraseña temporal:</span>
                          <div style="color: #fbbf24; font-size: 24px; font-weight: 700; font-family: monospace; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-top: 5px;">Quantum123.</div>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #f59e0b; font-size: 13px; margin: 15px 0 0 0; padding: 10px; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">
                      ⚠️ <strong>Importante:</strong> Al iniciar sesión por primera vez, el sistema te pedirá que cambies tu contraseña.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px 0;">
                    <a href="https://quantummatter.app/oaxaca/login" style="display: inline-block; background: linear-gradient(135deg, #00F0FF 0%, #0099CC 100%); color: #0a0f1a; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      🚀 Iniciar Sesión Ahora
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
                O copia este enlace: <br>
                <a href="https://quantummatter.app/oaxaca/login" style="color: #00F0FF; word-break: break-all;">https://quantummatter.app/oaxaca/login</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0, 0, 0, 0.3); padding: 20px 30px; text-align: center; border-top: 1px solid rgba(0, 240, 255, 0.1);">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Este ticket fue transferido por Ricardo Yair Santiago Vargas.<br>
                Si no esperabas este correo, puedes ignorarlo.<br><br>
                <strong style="color: #f59e0b;">⚠️ CORREO DE PRUEBA - Implementación de Transferencias</strong>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const result = await sendEmail(
      testEmail,
      '🎫 [PRUEBA] ¡Ricardo Yair te transfirió un ticket para VISIÓN 5!',
      emailHtml,
      { fromName: 'Impacto Cuántico Oaxaca' }
    );

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Correo de prueba enviado a ${testEmail}`,
        messageId: result.messageId 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
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
