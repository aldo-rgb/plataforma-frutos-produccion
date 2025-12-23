/**
 * Script para generar tareas para usuarios con carta aprobada sin tareas
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 59;
  const cartaId = 18;
  
  console.log(`\n🔄 Generando tareas para Usuario ${userId} (Juan Carlos) - Carta #${cartaId}...\n`);
  
  try {
    // Importar dinámicamente el generador compilado
    const { generateTasksForLetter } = await import('./lib/taskGenerator.js');
    
    const result = await generateTasksForLetter(cartaId);
    
    if (result.success) {
      console.log('\n✅ TAREAS GENERADAS EXITOSAMENTE');
      console.log(`📊 Total de tareas: ${result.tasksCreated}`);
      
      // Verificar tareas para hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayTasks = await prisma.taskInstance.findMany({
        where: {
          usuarioId: userId,
          dueDate: {
            gte: today,
            lt: tomorrow
          }
        },
        include: {
          Accion: {
            select: { texto: true }
          }
        }
      });
      
      console.log(`\n🎯 Tareas para HOY (${today.toISOString().split('T')[0]}): ${todayTasks.length}`);
      todayTasks.slice(0, 5).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.Accion.texto.substring(0, 50)}...`);
      });
      
    } else {
      console.log('\n❌ NO SE PUDIERON GENERAR TAREAS');
      console.log('Errores:', result.errors?.join(', '));
    }
    
  } catch (error) {
    console.error('\n❌ Error crítico:', error.message);
    console.error(error.stack);
  }
  
  await prisma.$disconnect();
}

main();
