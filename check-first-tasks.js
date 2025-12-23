const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');
const prisma = new PrismaClient();

async function checkTaskDates() {
  const tasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId: 48
    },
    orderBy: {
      dueDate: 'asc'
    },
    take: 20,
    include: {
      Accion: {
        include: {
          Meta: true
        }
      }
    }
  });
  
  console.log('\n📅 Primeras 20 tareas generadas:\n');
  tasks.forEach((t, i) => {
    const dayOfWeek = new Date(t.dueDate).getDay();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    console.log(`${i+1}. ${format(t.dueDate, 'yyyy-MM-dd')} (${dayNames[dayOfWeek]}) - [${t.Accion.Meta.categoria}] ${t.Accion.texto}`);
  });
  
  await prisma.$disconnect();
}

checkTaskDates();
