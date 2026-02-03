const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gateway = await prisma.paymentGatewayConfig.findFirst({
    where: { provider: 'MERCADOPAGO' }
  });
  
  if (!gateway || !gateway.secretKey) {
    console.log('No hay gateway de MercadoPago');
    return;
  }
  
  console.log('Probando token de MercadoPago...');
  console.log('Token (primeros 25 chars):', gateway.secretKey.substring(0, 25));
  
  // Probar el token haciendo una llamada simple
  const response = await fetch('https://api.mercadopago.com/users/me', {
    headers: {
      'Authorization': 'Bearer ' + gateway.secretKey
    }
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('\n✅ Token VÁLIDO');
    console.log('   User ID:', data.id);
    console.log('   Email:', data.email);
    console.log('   Site ID:', data.site_id);
    console.log('   Country:', data.country_id);
  } else {
    console.log('\n❌ Token INVÁLIDO');
    console.log('   Status:', response.status);
    console.log('   Error:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
