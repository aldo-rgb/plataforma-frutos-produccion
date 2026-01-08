const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteOldProducts() {
  try {
    console.log('🗑️  Eliminando productos antiguos de director@zero.com...\n');
    
    // Buscar el director
    const director = await prisma.usuario.findUnique({
      where: { email: 'director@zero.com' },
      select: { id: true, nombre: true, email: true }
    });

    if (!director) {
      console.log('❌ Director director@zero.com no encontrado');
      return;
    }

    console.log('👤 Director encontrado:');
    console.log('   ID:', director.id);
    console.log('   Email:', director.email);
    console.log('');

    // Buscar productos creados por este director
    const productos = await prisma.schoolProduct.findMany({
      where: { createdBy: director.id },
      select: {
        id: true,
        name: true,
        type: true,
        levelType: true,
      }
    });

    console.log(`📦 Productos encontrados: ${productos.length}`);
    if (productos.length === 0) {
      console.log('✅ No hay productos para eliminar');
      return;
    }

    console.log('');
    productos.forEach(p => {
      console.log(`   🔸 ${p.name} (${p.type}/${p.levelType}) - ID: ${p.id}`);
    });
    console.log('');

    // Eliminar todos los productos
    const deleteResult = await prisma.schoolProduct.deleteMany({
      where: { createdBy: director.id }
    });

    console.log(`✅ ${deleteResult.count} productos eliminados exitosamente`);
    console.log('');
    console.log('🎉 Limpieza completada. El director ahora tiene 0 productos.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOldProducts();
