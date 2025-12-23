const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
  const date = new Date('2025-12-18');
  date.setHours(0, 0, 0, 0);
  
  const tasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId: 48,
      dueDate: date
    },
    include: {
      Accion: {
        include: {
          Meta: true
        }
      }
    }
  });
  
  console.log('\n📅 Tareas para 2025-12-18:', tasks.length);
  tasks.forEach(t => {
    console.log(`  - [${t.Accion.Meta.categoria}] ${t.Accion.texto}`);
  });
  
  await prisma.$disconnect();
}

checkTasks();
