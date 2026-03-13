const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findUnique({
    where: { email: 'pruebalado@frutos.com' },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      referralCode: true,
      ambassadorBalance: true,
      isGraduated: true,
      tier: true,
      bankClabe: true,
      bankName: true
    }
  });
  console.log('User:', JSON.stringify(user, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
