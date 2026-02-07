const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar códigos GOLDEN con 50% de descuento
  const codes = await prisma.giftCode.findMany({
    where: {
      OR: [
        { code: { contains: 'GOLDEN50', mode: 'insensitive' } },
        { code: { contains: '257BB074', mode: 'insensitive' } }
      ]
    }
  });
  
  console.log('Códigos encontrados:', codes.length);
  codes.forEach(c => {
    console.log('---');
    console.log('Code:', c.code);
    console.log('Type:', c.type);
    console.log('Status:', c.status);
    console.log('isUsed:', c.isUsed);
    console.log('discountPercentage:', c.discountPercentage);
    console.log('organizationId:', c.organizationId);
    console.log('visionId:', c.visionId);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
