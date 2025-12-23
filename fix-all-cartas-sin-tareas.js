const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import necesario para generación de tareas
async function generateTasksForLetter(cartaId, usuarioId) {
  const { generateTasksForLetter: generator } = await import('./lib/taskGenerator.js');
  return generator(cartaId, usuarioId);
}

async function fixAllCartasSinTareas() {
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
          const generated = await generateTasksForLetter(carta.id, user.id);
          console.log(`   ✅ ${generated.length} tareas generadas\n`);
          fixed++;
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}\n`);
        }
      } else {
        console.log(`✅ Usuario ${user.id} (${user.nombre}) - ${taskCount} tareas - OK`);
        alreadyOk++;
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Ya tenían tareas: ${alreadyOk}`);
    console.log(`   🔧 Corregidos: ${fixed}`);
    console.log(`   📝 Total procesados: ${cartas.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllCartasSinTareas();
