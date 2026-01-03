const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.taskInstance.count({ where: { usuarioId: 37 } });
  console.log(`\nTareas actuales de v4: ${count}`);
  
  if (count > 0) {
    const first = await prisma.taskInstance.findMany({
      where: { usuarioId: 37 },
      select: { dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 3
    });
    
    console.log('\nPrimeras 3 fechas:');
    first.forEach((t, i) => {
      const utc = t.dueDate.toISOString().split('T')[0];
      const local = new Date(t.dueDate).toLocaleDateString('es-MX');
      console.log(`${i+1}. UTC: ${utc} | Local: ${local}`);
    });
  }
  
  await prisma.$disconnect();
}

check();
