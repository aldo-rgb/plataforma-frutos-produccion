const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  console.log(`\nHOY (UTC): ${hoy.toISOString().split('T')[0]}\n`);
  
  // Tareas de v4 (userId 37)
  const tasks = await prisma.taskInstance.findMany({
    where: { usuarioId: 37 },
    include: {
      Accion: { select: { nombre: true } }
    },
    orderBy: { dueDate: 'asc' },
    take: 10
  });
  
  console.log(`Total tareas (primeras 10):\n`);
  tasks.forEach(t => {
    const fecha = new Date(t.dueDate);
    const esAntes = fecha < hoy;
    console.log(`${esAntes ? '⚠️' : '✅'}  ${fecha.toISOString().split('T')[0]} - ${t.status} - ${t.Accion.nombre}`);
  });
  
  // Contar tareas antes de hoy
  const tareasPasadas = await prisma.taskInstance.count({
    where: {
      usuarioId: 37,
      dueDate: { lt: hoy }
    }
  });
  
  console.log(`\n⚠️  Tareas con fecha anterior a hoy: ${tareasPasadas}`);
  
  await prisma.$disconnect();
}

check();
