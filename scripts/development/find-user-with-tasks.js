const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUserWithTasks() {
  try {
    // Buscar usuarios con tareas
    const usersWithTasks = await prisma.taskInstance.groupBy({
      by: ['usuarioId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });
    
    console.log('\n👥 USUARIOS CON MÁS TAREAS:\n');
    
    for (const userGroup of usersWithTasks) {
      const user = await prisma.usuario.findUnique({
        where: { id: userGroup.usuarioId },
        select: { nombre: true, apellido: true, email: true }
      });
      
      console.log(`   Usuario ${userGroup.usuarioId}: ${user?.nombre} ${user?.apellido} (${userGroup._count.id} tareas)`);
    }
    
    // Tomar el primer usuario y ver sus tareas
    if (usersWithTasks.length > 0) {
      const userId = usersWithTasks[0].usuarioId;
      
      const tasks = await prisma.taskInstance.findMany({
        where: { usuarioId: userId },
        select: { dueDate: true },
        orderBy: { dueDate: 'asc' }
      });
      
      const firstDate = tasks[0].dueDate;
      const lastDate = tasks[tasks.length - 1].dueDate;
      const now = new Date();
      const futureTasks = tasks.filter(t => new Date(t.dueDate) > now);
      
      console.log(`\n📊 RANGO DE FECHAS (Usuario ${userId}):`);
      console.log(`   Primera tarea: ${firstDate.toISOString().split('T')[0]}`);
      console.log(`   Última tarea: ${lastDate.toISOString().split('T')[0]}`);
      console.log(`   Tareas futuras: ${futureTasks.length}`);
      
      if (futureTasks.length > 0) {
        console.log(`\n✅ Este usuario SÍ tiene tareas futuras. Úsalo para probar el calendario.`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findUserWithTasks();
