const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    const userId = 37; // v4@next.com
    
    // Ver todas las tareas del 30 de diciembre
    const tasks = await prisma.taskInstance.findMany({
      where: {
        usuarioId: userId,
        dueDate: {
          gte: new Date('2025-12-30T00:00:00Z'),
          lt: new Date('2025-12-31T00:00:00Z')
        }
      },
      include: {
        Accion: {
          select: {
            texto: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`\n📋 Tareas del 30 de diciembre: ${tasks.length}\n`);
    
    // Agrupar por accionId para ver duplicados
    const grouped = {};
    tasks.forEach(t => {
      const key = t.accionId;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(t);
    });
    
    console.log('📊 Agrupadas por acción:\n');
    Object.entries(grouped).forEach(([accionId, instances]) => {
      const texto = instances[0].Accion?.texto || 'Sin texto';
      console.log(`   Acción ${accionId}: "${texto.substring(0, 50)}..."`);
      console.log(`   Repeticiones: ${instances.length}`);
      console.log(`   IDs: ${instances.map(i => i.id).join(', ')}`);
      console.log('');
    });
    
    // Contar total de tareas del usuario
    const totalTasks = await prisma.taskInstance.count({
      where: { usuarioId: userId }
    });
    
    console.log(`\n📊 Total de tareas del usuario: ${totalTasks}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
