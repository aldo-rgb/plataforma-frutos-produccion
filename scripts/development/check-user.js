const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findUnique({
    where: { email: 'admin@frutos.com' }
  });
  
  console.log('Usuario:', user);
  console.log('Tiene password:', user?.password ? 'SÍ' : 'NO');
  
  await prisma.$disconnect();
}

check();
