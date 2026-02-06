const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllProductsDirector() {
  try {
    console.log('🗑️  Eliminando TODOS los productos de director@zero.com...\n');
    
    // Buscar el director
    const director = await prisma.usuario.findUnique({
      where: { email: 'director@zero.com' },
      select: { id: true, email: true }
    });

    if (!director) {
      console.log('❌ Director no encontrado');
      return;
    }

    console.log('👤 Director:', director.email, '(ID:', director.id, ')');
    console.log('');

    // Eliminar todos los productos del director
    const deleteResult = await prisma.schoolProduct.deleteMany({
      where: { createdBy: director.id }
    });

    console.log(`✅ ${deleteResult.count} productos eliminados`);
    console.log('');
    console.log('🎉 Ahora el director verá la opción de inicializar productos CORE o crear personalizados');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllProductsDirector();
