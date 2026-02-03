const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gateway = await prisma.paymentGatewayConfig.findFirst({
    where: { provider: 'MERCADOPAGO' }
  });
  
  if (!gateway || !gateway.secretKey) {
    console.log('No hay gateway de MercadoPago configurado');
    return;
  }
  
  console.log('=== Verificación completa de MercadoPago ===\n');
  
  // 1. Verificar usuario
  const userRes = await fetch('https://api.mercadopago.com/users/me', {
    headers: { 'Authorization': 'Bearer ' + gateway.secretKey }
  });
  const userData = await userRes.json();
  
  console.log('1. DATOS DEL USUARIO:');
  console.log('   ID:', userData.id);
  console.log('   Email:', userData.email);
  console.log('   Site ID:', userData.site_id);
  console.log('   Status:', userData.status?.site_status || 'N/A');
  
  // 2. Verificar si es cuenta de prueba
  const isTestUser = userData.email?.includes('@testuser.com') || 
                     userData.tags?.includes('test_user') ||
                     userData.id?.toString().startsWith('test');
  console.log('   Es cuenta de prueba:', isTestUser ? 'SÍ ⚠️' : 'NO ✅');
  
  // 3. Verificar estado de la cuenta
  console.log('\n2. ESTADO DE LA CUENTA:');
  if (userData.status) {
    console.log('   Site Status:', userData.status.site_status);
    console.log('   User Type:', userData.status.user_type);
    console.log('   Immediate Payment:', userData.status.immediate_payment ? 'Habilitado' : 'Deshabilitado');
  }
  
  // 4. Verificar permisos de la aplicación
  console.log('\n3. TOKEN INFO:');
  console.log('   Primeros 30 chars:', gateway.secretKey.substring(0, 30) + '...');
  
  // Verificar si el token es de producción o prueba
  // Los tokens de prueba suelen tener TEST en algún lugar o están asociados a usuarios de prueba
  const isTestToken = gateway.secretKey.includes('TEST') || 
                      gateway.secretKey.includes('test') ||
                      isTestUser;
  console.log('   Parece ser de producción:', !isTestToken ? 'SÍ ✅' : 'NO ⚠️');
  
  // 5. Intentar crear una preferencia de prueba
  console.log('\n4. PRUEBA DE CREACIÓN DE PREFERENCIA:');
  try {
    const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + gateway.secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: 'Test de verificación',
          quantity: 1,
          currency_id: 'MXN',
          unit_price: 1
        }],
        back_urls: {
          success: 'https://example.com/success',
          failure: 'https://example.com/failure',
          pending: 'https://example.com/pending'
        }
      })
    });
    
    const prefData = await prefRes.json();
    
    if (prefRes.ok) {
      console.log('   Preferencia creada: SÍ ✅');
      console.log('   ID:', prefData.id);
      console.log('   Sandbox init point:', prefData.sandbox_init_point ? 'Presente (PRUEBA ⚠️)' : 'No');
      console.log('   Init point:', prefData.init_point ? 'Presente ✅' : 'No');
      
      // Si tiene sandbox_init_point, la cuenta aún está en modo prueba
      if (prefData.sandbox_init_point && !prefData.init_point) {
        console.log('\n   ⚠️ PROBLEMA DETECTADO: La cuenta está en modo SANDBOX');
        console.log('   Necesitas activar el modo producción en MercadoPago');
      }
    } else {
      console.log('   Error al crear preferencia:', prefData.message || JSON.stringify(prefData));
    }
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log('\n=== FIN DE VERIFICACIÓN ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
