const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importar el generador de tareas
async function regenerateTasksDirectly() {
  try {
    const cartaId = 18;
    
    console.log(`🚀 Regenerando tareas para Carta #${cartaId}`);

    // Verificar que la carta existe y está aprobada
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId }
    });

    if (!carta) {
      console.error('❌ Carta no encontrada');
      return;
    }

    if (carta.estado !== 'APROBADA') {
      console.error(`❌ Carta no está aprobada (estado: ${carta.estado})`);
      return;
    }

    console.log(`✅ Carta encontrada: Usuario ${carta.usuarioId}, Estado: ${carta.estado}`);

    // Eliminar tareas existentes
    const deletedTasks = await prisma.taskInstance.deleteMany({
      where: {
        usuarioId: carta.usuarioId,
        Accion: {
          Meta: {
            cartaId: cartaId
          }
        }
      }
    });

    console.log(`🗑️  Eliminadas ${deletedTasks.count} tareas antiguas`);

    // Llamar directamente a generateTasksForLetter
    // Como está en TypeScript, necesitamos usar una alternativa
    console.log('📝 Ejecutando generación de tareas...');
    console.log('    Por favor, ejecuta el siguiente comando en el navegador o en Postman:');
    console.log('');
    console.log('    1. Inicia sesión como mentor o admin en http://localhost:3000');
    console.log('    2. Ve a la consola del navegador (F12)');
    console.log('    3. Ejecuta:');
    console.log('');
    console.log(`       fetch('/api/carta/regenerate', {`);
    console.log(`         method: 'POST',`);
    console.log(`         headers: { 'Content-Type': 'application/json' },`);
    console.log(`         body: JSON.stringify({ cartaId: ${cartaId} })`);
    console.log(`       }).then(r => r.json()).then(console.log)`);
    console.log('');
    console.log('    O mejor aún, ve al dashboard del mentor y haz clic en "Ver Detalle" de la carta');
    console.log('    y busca un botón para regenerar tareas.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateTasksDirectly();
