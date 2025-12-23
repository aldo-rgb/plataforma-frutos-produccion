/**
 * Script para generar tareas para TODOS los usuarios con carta aprobada sin tareas
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllMissingTasks() {
  console.log('\n🔍 Buscando usuarios con carta APROBADA sin tareas...\n');
  
  try {
    // Buscar todas las cartas APROBADAS
    const cartas = await prisma.cartaFrutos.findMany({
      where: {
        estado: 'APROBADA'
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: { usuarioId: 'asc' }
    });

    console.log(`📊 Total de cartas APROBADAS: ${cartas.length}\n`);

    let fixed = 0;
    let alreadyOk = 0;
    let errors = 0;

    for (const carta of cartas) {
      const user = carta.Usuario;
      
      // Verificar si tiene tareas
      const taskCount = await prisma.taskInstance.count({
        where: { usuarioId: user.id }
      });

      if (taskCount === 0) {
        console.log(`❌ Usuario ${user.id} (${user.nombre}) - Carta ${carta.id} - SIN TAREAS`);
        console.log(`   Generando tareas...`);
        
        try {
          // Importar dinámicamente el generador
          const { generateTasksForLetter } = await import('./lib/taskGenerator.js');
          
          const result = await generateTasksForLetter(carta.id);
          
          if (result.success) {
            console.log(`   ✅ ${result.tasksCreated} tareas generadas\n`);
            fixed++;
          } else {
            console.log(`   ❌ Error: ${result.errors?.join(', ')}\n`);
            errors++;
          }
        } catch (error) {
          console.log(`   ❌ Error crítico: ${error.message}\n`);
          errors++;
        }
      } else {
        console.log(`✅ Usuario ${user.id} (${user.nombre}) - ${taskCount} tareas - OK`);
        alreadyOk++;
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Ya tenían tareas: ${alreadyOk}`);
    console.log(`   🔧 Corregidos: ${fixed}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📝 Total procesados: ${cartas.length}\n`);

  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllMissingTasks();
