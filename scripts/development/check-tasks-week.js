const { PrismaClient } = require('@prisma/client');
const { format, addDays } = require('date-fns');

const prisma = new PrismaClient();

async function checkTasksNextDays() {
  try {
    console.log('\n📅 Resumen de tareas para los próximos 7 días\n');

    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
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

      const dayName = format(date, 'EEEE');
      const dateStr = format(date, 'yyyy-MM-dd');
      
      console.log(`${dayName} ${dateStr}: ${tasks.length} tareas`);
      
      if (tasks.length > 0 && tasks.length <= 15) {
        tasks.forEach((task, index) => {
          const area = task.Accion.Meta.categoria;
          const texto = task.Accion.texto;
          console.log(`  ${index + 1}. [${area}] ${texto}`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasksNextDays();
