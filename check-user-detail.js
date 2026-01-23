const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    // El usuario de la imagen parece estar en AVANZADO
    // Vamos a buscar usuarios en avanzado con tickets PL pendientes
    
    // Buscar productos de PL para ver precios configurados
    const vision24 = await prisma.vision.findFirst({
      where: { nombre: { contains: '24' } }
    });
    
    const products = await prisma.schoolProduct.findMany({
      where: { visionId: vision24.id },
      select: {
        levelType: true,
        basePrice: true,
        promoPrice: true
      }
    });
    
    console.log('💰 Precios configurados para Vision 24:');
    products.forEach(p => {
      console.log(`  ${p.levelType}: base=$${p.basePrice} promo=$${p.promoPrice || 'N/A'}`);
    });
    
    // Buscar OrganizationDefaultPrice
    const defaultPrices = await prisma.organizationDefaultPrice.findMany({
      where: { organizationId: vision24.organizationId }
    });
    
    console.log('\n📊 OrganizationDefaultPrice:');
    defaultPrices.forEach(p => {
      console.log(`  ${p.levelType}: base=$${p.basePrice} promo=$${p.promoPrice || 'N/A'}`);
    });
    
    // Ver usuarios en avanzado con ticket PL pendiente
    const usersWithPendingPL = await prisma.ticket.findMany({
      where: {
        level: 'PL',
        status: { in: ['PENDING_PAYMENT', 'PROMO_AVAILABLE', 'RESERVED'] },
        vision: { nombre: { contains: '24' } }
      },
      include: {
        owner: { select: { id: true, nombre: true, currentVisionLevel: true } }
      }
    });
    
    console.log('\n👥 Usuarios con PL pendiente en Vision 24:');
    usersWithPendingPL.forEach(t => {
      console.log({
        usuario: t.owner.nombre,
        nivel: t.owner.currentVisionLevel,
        plStatus: t.status,
        plPaymentStatus: t.paymentStatus,
        type: t.type,
        amountPaid: t.amountPaid,
        costAtPurchase: t.costAtPurchase
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
