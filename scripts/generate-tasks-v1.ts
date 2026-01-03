import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Generando tareas para v1@next.com (Usuario 34, Carta 26)...\n');
  
  // Importar el generador de tareas
  const { generateTasksForLetter } = await import('../lib/taskGenerator');
  
  try {
    const result = await generateTasksForLetter(26);
    
    if (result.success) {
      console.log(`\n✅ ${result.tasksCreated} tareas generadas exitosamente`);
      console.log(`Desde: ${result.cycleStart}`);
      console.log(`Hasta: ${result.cycleEnd}`);
    } else {
      console.error('\n❌ Error generando tareas:');
      console.error(result.errors);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
