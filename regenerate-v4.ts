import { PrismaClient } from '@prisma/client';
import { generateTasksForLetter } from './lib/taskGenerator';

const prisma = new PrismaClient();
const userId = 37; // v4@next.com

async function regenerateV4() {
  try {
    console.log('\n🚀 REGENERANDO TAREAS PARA v4@next.com\n');
    
    // 1. Limpiar tareas existentes
    const deleted = await prisma.taskInstance.deleteMany({
      where: { usuarioId: userId }
    });
    
    console.log(`🗑️  Eliminadas ${deleted.count} tareas antiguas`);
    
    // 2. Regenerar con fechas correctas (desde HOY)
    console.log('\n📅 Generando tareas desde: 29 diciembre 2025\n');
    
    const result = await generateTasksForLetter(27); // Carta ID 27
    
    if (result.success) {
      console.log(`\n✅ ÉXITO: ${result.tasksCreated} tareas generadas`);
      
      // Verificar
      const tasks = await prisma.taskInstance.findMany({
        where: { usuarioId: userId },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: {
          Accion: {
            select: { texto: true }
          }
        }
      });
      
      console.log('\n📋 Primeras 10 tareas:');
      tasks.forEach((t, idx) => {
        console.log(`   ${idx + 1}. ${t.dueDate.toISOString().split('T')[0]} - ${t.Accion?.texto?.substring(0, 50)}...`);
      });
      
    } else {
      console.log(`\n❌ ERROR:`, result.errors);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateV4();
