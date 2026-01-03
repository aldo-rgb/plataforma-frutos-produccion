const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTaskDates() {
  try {
    const userId = 2; // Carlos
    
    // Obtener todas las tareas
    const tasks = await prisma.taskInstance.findMany({
      where: { usuarioId: userId },
      select: {
        id: true,
        dueDate: true,
        status: true
      },
      orderBy: { dueDate: 'desc' },
      take: 20
    });
    
    console.log('\n📅 ÚLTIMAS 20 TAREAS DE CARLOS:\n');
    
    if (tasks.length === 0) {
      console.log('❌ No hay tareas para este usuario');
      return;
    }
    
    tasks.forEach((t, idx) => {
      const isPast = new Date(t.dueDate) < new Date();
      const emoji = isPast ? '⏪' : '⏩';
      console.log(`${emoji} ${idx + 1}. ${t.dueDate.toISOString().split('T')[0]} | ${t.status} | ID: ${t.id}`);
    });
    
    // Rango de fechas
    const allTasks = await prisma.taskInstance.findMany({
      where: { usuarioId: userId },
      select: { dueDate: true },
      orderBy: { dueDate: 'asc' }
    });
    
    if (allTasks.length > 0) {
      const firstDate = allTasks[0].dueDate;
      const lastDate = allTasks[allTasks.length - 1].dueDate;
      
      console.log(`\n📊 RANGO DE FECHAS:`);
      console.log(`   Primera tarea: ${firstDate.toISOString().split('T')[0]}`);
      console.log(`   Última tarea: ${lastDate.toISOString().split('T')[0]}`);
      console.log(`   Total de tareas: ${allTasks.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTaskDates();
