import { generateTasksForLetter } from './lib/taskGenerator.ts';
import { prisma } from './lib/prisma.ts';

async function regenerate() {
  try {
    const cartaId = 18;
    
    console.log('🚀 Generando tareas para Carta #18...');
    
    // Eliminar tareas existentes primero
    const deleted = await prisma.taskInstance.deleteMany({
      where: {
        usuarioId: 59,
        Accion: {
          Meta: {
            cartaId: cartaId
          }
        }
      }
    });
    
    console.log(`🗑️  Eliminadas ${deleted.count} tareas antiguas`);
    
    const result = await generateTasksForLetter(cartaId);
    
    console.log('\n✅ RESULTADO:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Tareas creadas: ${result.tasksCreated}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      result.errors.forEach(err => console.log(`   - ${err}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
