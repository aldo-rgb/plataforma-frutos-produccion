import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Generar contraseña temporal aleatoria
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Template del email de recuperación
function getPasswordResetEmailTemplate(nombre: string, tempPassword: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Contraseña - Impacto Cuántico</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                🔐 Recuperación de Contraseña
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Hola <strong style="color: #22d3ee;">${nombre}</strong>,
              </p>
              
              <p style="margin: 0 0 25px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                Recibimos una solicitud para restablecer tu contraseña. Aquí tienes tu nueva contraseña temporal:
              </p>
              
              <!-- Password Box -->
              <div style="background-color: #0f172a; border: 2px solid #22d3ee; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                  Tu nueva contraseña
                </p>
                <p style="margin: 0; color: #22d3ee; font-size: 28px; font-weight: 700; letter-spacing: 3px; font-family: monospace;">
                  ${tempPassword}
                </p>
              </div>
              
              <p style="margin: 0 0 15px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                📌 <strong style="color: #e2e8f0;">Instrucciones:</strong>
              </p>
              <ol style="margin: 0 0 25px; padding-left: 20px; color: #94a3b8; font-size: 14px; line-height: 1.8;">
                <li>Inicia sesión con esta contraseña temporal</li>
                <li>Se te pedirá cambiarla por una nueva de tu elección</li>
                <li>Asegúrate de usar una contraseña segura</li>
              </ol>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://impactocuantico.net/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Iniciar Sesión
                </a>
              </div>
              
              <!-- Security Note -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin-top: 30px;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                  ⚠️ <strong>Nota de seguridad:</strong> Si tú no solicitaste este cambio, ignora este correo. Tu contraseña anterior seguirá funcionando hasta que uses la nueva.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 25px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 12px;">
                Este correo fue enviado automáticamente por el sistema.
              </p>
              <p style="margin: 0; color: #475569; font-size: 11px;">
                © ${new Date().getFullYear()} Impacto Cuántico. Todos los derechos reservados.
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'El correo es requerido' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Buscar usuario por email
    const user = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        nombre: true,
        email: true,
      }
    });

    // Por seguridad, siempre responder con éxito aunque no exista
    // Esto evita que alguien pueda verificar qué emails están registrados
    if (!user) {
      logger.debug(`Password reset requested for non-existent email: ${normalizedEmail}`);
      // Simular delay para que parezca que se procesó
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ success: true });
    }

    // Generar contraseña temporal
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Actualizar usuario con nueva contraseña y marcar para cambio obligatorio
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: true,
      }
    });

    // Enviar email con la nueva contraseña
    const emailHtml = getPasswordResetEmailTemplate(
      user.nombre || 'Usuario',
      tempPassword
    );

    const emailResult = await sendEmail(
      user.email,
      '🔐 Tu Nueva Contraseña - Impacto Cuántico',
      emailHtml,
      { fromName: 'Impacto Cuántico' }
    );

    if (!emailResult.success) {
      logger.error('Failed to send password reset email:', emailResult.error);
      // Aún así responder con éxito por seguridad
    } else {
      logger.debug(`Password reset email sent to: ${user.email}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error in forgot-password:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
