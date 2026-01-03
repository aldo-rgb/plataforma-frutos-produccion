import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function regenerate() {
  console.log('\n🔧 REGENERANDO TAREAS DE v4\n');
  console.log('⏰ Hora actual:', new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));
  
  try {
    // Eliminar tareas existentes
    const deleted = await prisma.taskInstance.deleteMany({
      where: { usuarioId: 37 }
    });
    console.log(`✅ Eliminadas ${deleted.count} tareas\n`);
    
    // Importar dinámicamente
    const { generateTasksForLetter } = await import('../lib/taskGenerator');
    
    console.log('🔄 Generando nuevas tareas...\n');
    await generateTasksForLetter(27);
    
    // Verificar
    const tasks = await prisma.taskInstance.findMany({
      where: { usuarioId: 37 },
      select: { id: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 5
    });
    
    console.log('\n📅 Primeras 5 tareas:\n');
    tasks.forEach((t, i) => {
      console.log(`${i + 1}. ${t.dueDate.toISOString().split('T')[0]}`);
    });
    
    const total = await prisma.taskInstance.count({ where: { usuarioId: 37 } });
    console.log(`\n✅ Total: ${total}\n`);
    
  } catch (error: any) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
