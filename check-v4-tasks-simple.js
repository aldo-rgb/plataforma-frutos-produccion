const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const hoy = new Date();
  console.log(`\nHOY: ${hoy.toISOString()}\n`);
  
  // Tareas de v4
  const tasks = await prisma.taskInstance.findMany({
    where: { cartaFrutosId: 27 },
    select: {
      id: true,
      scheduledDate: true,
      estado: true
    },
    orderBy: { scheduledDate: 'asc' },
    take: 10
  });
  
  console.log(`Total tareas (primeras 10):`);
  tasks.forEach(t => {
    console.log(`  ${t.scheduledDate.toISOString().split('T')[0]} - ${t.estado}`);
  });
  
  await prisma.$disconnect();
}

check();
