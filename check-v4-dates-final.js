const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tasks = await prisma.taskInstance.findMany({
    where: { usuarioId: 37 },
    select: {
      id: true,
      dueDate: true,
      createdAt: true
    },
    orderBy: { dueDate: 'asc' },
    take: 5
  });
  
  console.log('\n📅 PRIMERAS 5 TAREAS DE v4:\n');
  tasks.forEach((t, i) => {
    console.log(`${i + 1}. Task ID: ${t.id}`);
    console.log(`   dueDate (UTC): ${t.dueDate.toISOString()}`);
    console.log(`   dueDate (Local): ${t.dueDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
    console.log(`   createdAt: ${t.createdAt.toISOString()}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

check();
