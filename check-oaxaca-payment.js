const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.paymentGatewayConfig.findUnique({
    where: { organizationId: 5 },
    include: { organization: { select: { name: true } } }
  });
  
  if (config) {
    console.log('Org:', config.organization?.name);
    console.log('Provider:', config.provider);
    console.log('Active:', config.isActive);
    console.log('HasSecret:', !!config.secretKey);
    console.log('SecretStart:', config.secretKey?.substring(0, 10));
  } else {
    console.log('No config for org 5');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
