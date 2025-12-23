const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateTasks() {
  try {
    console.log('🔍 Buscando carta de Juan Carlos...');
    
    // Buscar el usuario Juan Carlos
    const usuario = await prisma.usuario.findFirst({
      where: {
        email: 'juansegura@entregax.com'
      }
    });

    if (!usuario) {
      console.error('❌ Usuario Juan Carlos no encontrado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${usuario.nombre} (ID: ${usuario.id})`);

    // Buscar su carta aprobada
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        usuarioId: usuario.id,
        estado: 'APROBADA'
      }
    });

    if (!carta) {
      console.error('❌ Carta aprobada no encontrada');
      return;
    }

    console.log(`✅ Carta encontrada: ID ${carta.id}, Estado: ${carta.estado}`);

    // Verificar tareas existentes
    const existingTasks = await prisma.taskInstance.count({
      where: {
        usuarioId: usuario.id
      }
    });

    console.log(`📊 Tareas existentes: ${existingTasks}`);

    if (existingTasks > 0) {
      console.log('⚠️  Ya existen tareas. ¿Deseas eliminarlas y regenerar? (Este script NO las eliminará automáticamente)');
      console.log('    Para eliminar: DELETE FROM "TaskInstance" WHERE "usuarioId" = ' + usuario.id);
      return;
    }

    // Llamar a la API de aprobación para regenerar tareas
    console.log('🚀 Regenerando tareas...');
    console.log('📝 Ejecuta este comando para regenerar las tareas:');
    console.log(`   curl -X POST http://localhost:3000/api/carta/regenerate -H "Content-Type: application/json" -d '{"cartaId": ${carta.id}}'`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateTasks();
