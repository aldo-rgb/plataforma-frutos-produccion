const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkV4Tasks() {
  try {
    const userId = 37; // v4@next.com
    
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        nombre: true,
        email: true,
        createdAt: true
      }
    });
    
    console.log(`\n👤 Usuario: ${user.nombre} (${user.email})`);
    console.log(`   Creado: ${user.createdAt.toISOString().split('T')[0]}`);
    
    // Verificar carta
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      select: { 
        id: true,
        estado: true,
        autorizadoMentor: true,
        autorizadoCoord: true,
        fechaCreacion: true
      }
    });
    
    if (carta) {
      console.log(`\n📜 Carta Frutos:`);
      console.log(`   Estado: ${carta.estado}`);
      console.log(`   Autorizado Mentor: ${carta.autorizadoMentor}`);
      console.log(`   Autorizado Coord: ${carta.autorizadoCoord}`);
      console.log(`   Creada: ${carta.fechaCreacion.toISOString().split('T')[0]}`);
    } else {
      console.log('\n❌ No tiene Carta Frutos');
    }
    
    // Ver tareas
    const tasks = await prisma.taskInstance.findMany({
      where: { usuarioId: userId },
      include: {
        Accion: {
          select: {
            texto: true,
            frequency: true,
            rarity: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    console.log(`\n📋 TAREAS (${tasks.length} total):\n`);
    
    if (tasks.length === 0) {
      console.log('❌ No hay tareas generadas');
      console.log('\n💡 SOLUCIÓN: Necesitas regenerar las tareas con fechas de 2025');
    } else {
      const now = new Date();
      const tasksByRarity = {};
      const pastTasks = tasks.filter(t => new Date(t.dueDate) < now);
      const futureTasks = tasks.filter(t => new Date(t.dueDate) >= now);
      
      tasks.forEach(t => {
        const rarity = t.Accion?.rarity || 'UNKNOWN';
        tasksByRarity[rarity] = (tasksByRarity[rarity] || 0) + 1;
      });
      
      console.log('📊 Por rareza:');
      Object.entries(tasksByRarity).forEach(([rarity, count]) => {
        console.log(`   ${rarity}: ${count} tareas`);
      });
      
      console.log(`\n📅 Fechas:`);
      console.log(`   Primera tarea: ${tasks[0].dueDate.toISOString().split('T')[0]}`);
      console.log(`   Última tarea: ${tasks[tasks.length - 1].dueDate.toISOString().split('T')[0]}`);
      console.log(`   Tareas pasadas: ${pastTasks.length}`);
      console.log(`   Tareas futuras: ${futureTasks.length}`);
      
      console.log(`\n🔍 Últimas 20 tareas:`);
      tasks.slice(-20).forEach((t, idx) => {
        const isPast = new Date(t.dueDate) < now;
        const emoji = isPast ? '⏪' : '⏩';
        const rarity = t.Accion?.rarity || 'UNKNOWN';
        console.log(`   ${emoji} ${t.dueDate.toISOString().split('T')[0]} | ${rarity.padEnd(15)} | ${t.status}`);
      });
      
      if (futureTasks.length === 0) {
        const lastYear = tasks[tasks.length - 1].dueDate.toISOString().split('T')[0].substring(0, 4);
        console.log(`\n❌ PROBLEMA: Todas las tareas están en ${lastYear}, pero estamos en 2025`);
        console.log('💡 SOLUCIÓN: Eliminar tareas antiguas y regenerar con fechas correctas desde HOY (29 de diciembre de 2025)');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkV4Tasks();
