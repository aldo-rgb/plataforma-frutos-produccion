const { PrismaClient } = require('@prisma/client');
const { generateTasksForLetter } = require('./lib/taskGenerator');
const prisma = new PrismaClient();

async function regenerate() {
  console.log('\n🔧 REGENERANDO TAREAS DE v4 CON FECHAS CORRECTAS\n');
  
  try {
    // 1. Eliminar tareas existentes
    const deleted = await prisma.taskInstance.deleteMany({
      where: { usuarioId: 37 }
    });
    console.log(`✅ Eliminadas ${deleted.count} tareas antiguas\n`);
    
    // 2. Regenerar tareas con fechas correctas (ahora usa hora local, no UTC)
    console.log('🔄 Generando nuevas tareas...\n');
    await generateTasksForLetter(27); // CartaFrutos ID de v4
    
    // 3. Verificar las nuevas fechas
    const newTasks = await prisma.taskInstance.findMany({
      where: { usuarioId: 37 },
      select: {
        id: true,
        dueDate: true
      },
      orderBy: { dueDate: 'asc' },
      take: 5
    });
    
    console.log('\n📅 VERIFICACIÓN - Primeras 5 tareas regeneradas:\n');
    newTasks.forEach((t, i) => {
      const fechaLocal = t.dueDate.toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      console.log(`${i + 1}. dueDate: ${t.dueDate.toISOString().split('T')[0]} (Local MX: ${fechaLocal})`);
    });
    
    const total = await prisma.taskInstance.count({
      where: { usuarioId: 37 }
    });
    
    console.log(`\n✅ Total de tareas regeneradas: ${total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
