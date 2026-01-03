const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixV4Tasks() {
  try {
    const userId = 37; // v4@next.com
    
    console.log('\n🔧 REPARANDO TAREAS DE v4@next.com\n');
    
    // 1. Verificar carta
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      select: { 
        id: true,
        estado: true,
        autorizadoMentor: true
      }
    });
    
    if (!carta) {
      console.log('❌ No se encontró carta para este usuario');
      return;
    }
    
    console.log(`📜 Carta encontrada: ID ${carta.id} (${carta.estado})`);
    
    if (carta.estado !== 'APROBADA') {
      console.log('❌ La carta no está aprobada. Estado:', carta.estado);
      return;
    }
    
    // 2. Eliminar tareas antiguas
    const deletedTasks = await prisma.taskInstance.deleteMany({
      where: {
        usuarioId: userId
      }
    });
    
    console.log(`🗑️  Eliminadas ${deletedTasks.count} tareas antiguas`);
    
    // 3. Importar y ejecutar el generador de tareas
    console.log('\n🚀 Generando tareas desde HOY (29 diciembre 2025)...\n');
    
    const { generateTasksForLetter } = await import('./lib/taskGenerator.js');
    const result = await generateTasksForLetter(carta.id);
    
    if (result.success) {
      console.log(`\n✅ ÉXITO: ${result.tasksCreated} tareas generadas correctamente`);
      
      // Verificar resultado
      const allTasks = await prisma.taskInstance.findMany({
        where: { usuarioId: userId },
        orderBy: { dueDate: 'asc' },
        take: 10
      });
      
      console.log('\n📅 Primeras 10 tareas:');
      allTasks.forEach((t, idx) => {
        console.log(`   ${idx + 1}. ${t.dueDate.toISOString().split('T')[0]} | ${t.status}`);
      });
      
      // Contar tareas por semana
      const today = new Date();
      const thisWeek = allTasks.filter(t => {
        const diff = (new Date(t.dueDate) - today) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
      });
      
      console.log(`\n📊 Tareas esta semana: ${thisWeek.length}`);
      console.log('🎉 ¡Calendario reparado! Ahora mostrará las tareas futuras correctamente.');
      
    } else {
      console.log('\n❌ ERROR:', result.errors);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixV4Tasks();
