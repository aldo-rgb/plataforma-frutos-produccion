const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Monterrey', mode: 'insensitive' } }
  });
  
  if (org) {
    console.log('ORGANIZACION');
    console.log('ID:', org.id);
    console.log('Nombre:', org.name);
    
    const gateway = await prisma.paymentGatewayConfig.findUnique({
      where: { organizationId: org.id }
    });
    
    console.log('');
    console.log('PASARELA');
    if (gateway) {
      console.log('Provider:', gateway.provider);
      console.log('Activa:', gateway.isActive);
      console.log('Tiene SecretKey:', !!gateway.secretKey);
    } else {
      console.log('NO TIENE PASARELA');
    }
  } else {
    console.log('No se encontro');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
