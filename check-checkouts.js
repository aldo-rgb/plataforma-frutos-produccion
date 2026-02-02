const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CHECKOUTS ABANDONADOS ===\n');
  
  const checkouts = await prisma.abandonedCheckout.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      email: true,
      status: true,
      userId: true,
      registrationData: true,
      passwordHash: true,
      createdAt: true
    }
  });
  
  for (const c of checkouts) {
    const minutesAgo = (Date.now() - new Date(c.createdAt).getTime()) / 1000 / 60;
    console.log({
      id: c.id.substring(0, 15) + '...',
      email: c.email,
      status: c.status,
      hasUser: !!c.userId,
      hasRegData: !!c.registrationData,
      hasPassword: !!c.passwordHash,
      minutesAgo: Math.round(minutesAgo)
    });
  }
  
  // Verificar la condición del cron
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  console.log('\n=== CHECKOUTS QUE CUMPLEN CONDICIONES DEL CRON ===');
  console.log('(status=IN_CHECKOUT y createdAt < 5 min ago)\n');
  
  const eligibleCheckouts = await prisma.abandonedCheckout.findMany({
    where: {
      status: 'IN_CHECKOUT',
      createdAt: { lt: fiveMinutesAgo }
    },
    select: {
      id: true,
      email: true,
      userId: true,
      registrationData: true,
      passwordHash: true
    }
  });
  
  console.log(`Total encontrados: ${eligibleCheckouts.length}`);
  
  for (const c of eligibleCheckouts) {
    console.log({
      id: c.id.substring(0, 15) + '...',
      email: c.email,
      hasUser: !!c.userId,
      hasRegData: !!c.registrationData,
      regDataContent: c.registrationData ? JSON.stringify(c.registrationData).substring(0, 100) : null,
      hasPassword: !!c.passwordHash
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
