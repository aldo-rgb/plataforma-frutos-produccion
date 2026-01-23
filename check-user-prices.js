const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
  try {
    // Buscar Vision 24
    const vision24 = await prisma.vision.findFirst({
      where: { nombre: { contains: '24' } }
    });
    
    // Productos de SchoolProduct
    const products = await prisma.schoolProduct.findMany({
      where: { visionId: vision24.id },
      select: { levelType: true, basePrice: true, promoPrice: true }
    });
    
    console.log('📦 SchoolProduct para Vision 24:');
    products.forEach(p => {
      console.log(`  ${p.levelType}: base=$${p.basePrice} promo=$${p.promoPrice || 'N/A'}`);
    });
    
    // OrganizationDefaultPrice
    const defaultPrices = await prisma.organizationDefaultPrice.findMany({
      where: { organizationId: vision24.organizationId }
    });
    
    console.log('\n💰 OrganizationDefaultPrice:');
    defaultPrices.forEach(p => {
      console.log(`  ${p.levelType}: base=$${p.basePrice} promo=$${p.promoPrice || 'N/A'}`);
    });

    // Ver descuento de $1,500: parece ser la diferencia entre precio base ($11,000) y promo ($9,500)
    // O podría ser que pagó algo antes
    console.log('\n📊 Análisis de descuento:');
    console.log('  Precio base PL: $11,000');
    console.log('  Si el usuario ve $11,000, NO tiene descuento');
    console.log('  El descuento de $1,500 sería si ve $9,500 (promo)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrices();
