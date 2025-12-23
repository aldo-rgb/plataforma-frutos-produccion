import { PrismaClient } from '@prisma/client';
import { generateTasksForLetter } from '../lib/taskGenerator';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Generando tareas para carta 15...');
  const result = await generateTasksForLetter(15);
  
  if (result.success) {
    console.log(`✅ ${result.tasksCreated} tareas generadas exitosamente!`);
    
    // Verificar
    const tasks = await prisma.taskInstance.count({
      where: { usuarioId: 57 }
    });
    console.log(`✅ Verificación: ${tasks} tareas en BD`);
  } else {
    console.error('❌ Error:', result.errors);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
