const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndDeleteProducts() {
  try {
    console.log('🔍 Verificando productos de director@zero.com...\n');
    
    // Buscar el director
    const director = await prisma.usuario.findUnique({
      where: { email: 'director@zero.com' },
      select: { id: true, nombre: true, email: true, organizationId: true }
    });

    if (!director) {
      console.log('❌ Director director@zero.com no encontrado');
      return;
    }

    console.log('👤 Director encontrado:');
    console.log('   ID:', director.id);
    console.log('   Email:', director.email);
    console.log('   Organization ID:', director.organizationId);
    console.log('');

    // Buscar TODOS los productos de la organización
    const todosProductos = await prisma.schoolProduct.findMany({
      where: { organizationId: director.organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        levelType: true,
        createdBy: true,
        organizationId: true,
      }
    });

    console.log(`📦 Total productos en la organización: ${todosProductos.length}`);
    todosProductos.forEach(p => {
      console.log(`   🔹 ID: ${p.id} | ${p.name} (${p.type}/${p.levelType}) | createdBy: ${p.createdBy}`);
    });
    console.log('');

    // Productos creados por este director específicamente
    const productosDirector = todosProductos.filter(p => p.createdBy === director.id);
    console.log(`🎯 Productos creados por director@zero.com (ID: ${director.id}): ${productosDirector.length}`);
    
    if (productosDirector.length > 0) {
      productosDirector.forEach(p => {
        console.log(`   ❌ ${p.name} (${p.type}/${p.levelType}) - ID: ${p.id}`);
      });
      console.log('');
      console.log('🗑️  Eliminando estos productos...');
      
      const productIds = productosDirector.map(p => p.id);
      const deleteResult = await prisma.schoolProduct.deleteMany({
        where: { 
          id: { in: productIds }
        }
      });

      console.log(`✅ ${deleteResult.count} productos eliminados exitosamente`);
    } else {
      console.log('✅ No hay productos para eliminar');
    }

    // Verificar productos de otros directores
    const productosOtros = todosProductos.filter(p => p.createdBy !== director.id);
    if (productosOtros.length > 0) {
      console.log('');
      console.log(`ℹ️  Productos de otros directores (${productosOtros.length}):`);
      productosOtros.forEach(p => {
        console.log(`   🔸 ${p.name} (${p.type}/${p.levelType}) - createdBy: ${p.createdBy}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndDeleteProducts();
