const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Configuración actual de MercadoPago ===\n');
  
  const gateways = await prisma.paymentGatewayConfig.findMany({
    where: { provider: 'MERCADOPAGO' },
    include: { organization: { select: { name: true, slug: true } } }
  });
  
  if (gateways.length === 0) {
    console.log('No hay configuración de MercadoPago');
    return;
  }
  
  for (const g of gateways) {
    console.log('Organización:', g.organization.name);
    console.log('Provider:', g.provider);
    console.log('Activo:', g.isActive);
    console.log('Secret Key (primeros 35 chars):', g.secretKey ? g.secretKey.substring(0, 35) + '...' : 'NULL');
    console.log('Última actualización:', g.updatedAt);
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
