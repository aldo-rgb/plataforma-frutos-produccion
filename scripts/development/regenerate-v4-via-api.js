const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateViaAPI() {
  try {
    const userId = 37; // v4@next.com
    
    console.log('\n🔧 REGENERANDO TAREAS VÍA API para v4@next.com\n');
    
    // 1. Verificar carta
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      select: { 
        id: true,
        estado: true
      }
    });
    
    if (!carta) {
      console.log('❌ No se encontró carta');
      return;
    }
    
    console.log(`📜 Carta ID: ${carta.id} (${carta.estado})`);
    
    // 2. Eliminar tareas existentes
    const deleted = await prisma.taskInstance.deleteMany({
      where: { usuarioId: userId }
    });
    
    console.log(`🗑️  Eliminadas ${deleted.count} tareas antiguas`);
    
    // 3. Eliminar enrollment para permitir regeneración
    const deletedEnrollment = await prisma.programEnrollment.deleteMany({
      where: { 
        userId: userId
      }
    });
    
    console.log(`🗑️  Eliminados ${deletedEnrollment.count} enrollments`);
    
    console.log('\n✅ Limpieza completada');
    console.log('\n📝 SIGUIENTE PASO:');
    console.log('   Ve a: http://localhost:3000/api/carta/regenerate');
    console.log(`   Método: POST`);
    console.log(`   Body: { "cartaId": ${carta.id} }`);
    console.log('\n   O ejecuta este comando:\n');
    console.log(`   curl -X POST http://localhost:3000/api/carta/regenerate \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"cartaId": ${carta.id}}'`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateViaAPI();
