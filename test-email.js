require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('=== Probando envío de correo con Resend ===\n');
  
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@send.zaia.mx';
  const TO_EMAIL = 'camposaldo5@gmail.com'; // Ahora podemos enviar a cualquier email
  
  console.log('Configuración:');
  console.log('  Resend API Key:', RESEND_API_KEY ? RESEND_API_KEY.substring(0, 15) + '...' : 'NO CONFIGURADA');
  console.log('  From Email:', FROM_EMAIL);
  console.log('  To Email:', TO_EMAIL);
  console.log('');
  
  if (!RESEND_API_KEY) {
    console.log('❌ Falta RESEND_API_KEY en .env.local');
    console.log('   Necesitas agregar: RESEND_API_KEY="re_xxxxx"');
    return;
  }
  
  try {
    console.log('Enviando correo de prueba a', TO_EMAIL, '...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: '🧪 Prueba de Correo - Plataforma Frutos',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h1 style="color: #6366F1; text-align: center;">🎉 ¡Correo de Prueba!</h1>
            <p style="font-size: 16px;">Este es un correo de prueba enviado desde la <strong>Plataforma Frutos</strong>.</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
            <hr style="border: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
              Si recibiste este correo, el sistema de emails está funcionando correctamente. ✅
            </p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Error de Resend API:', data);
      return;
    }

    console.log('✅ Correo enviado exitosamente!');
    console.log('   Message ID:', data.id);
  } catch (error) {
    console.log('❌ Error al enviar correo:', error.message);
  }
}

testEmail();
