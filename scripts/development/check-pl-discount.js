const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDiscount() {
  try {
    // Buscar el usuario de la imagen (parece ser alguien en avanzado que quiere PL)
    // El precio muestra $11,000 - eso es el precio completo sin descuento
    
    // Veamos la configuración de precios de PL
    const vision24 = await prisma.vision.findFirst({
      where: { nombre: { contains: '24' } },
      include: {
        financialConfig: true,
        organization: {
          include: { financialConfig: true }
        }
      }
    });
    
    console.log('Vision 24 financial config:', vision24.financialConfig);
    console.log('Org financial config:', vision24.organization?.financialConfig);
    
    // Buscar productos de PL
    const plProducts = await prisma.schoolProduct.findMany({
      where: {
        visionId: vision24.id,
        levelType: 'PL'
      }
    });
    
    console.log('\n📦 Productos PL:', plProducts);
    
    // Ver la lógica de precios
    const orgConfig = await prisma.organizationFinancialConfig.findFirst({
      where: { organizationId: vision24.organizationId }
    });
    
    console.log('\n💰 Configuración financiera org:', orgConfig);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDiscount();
