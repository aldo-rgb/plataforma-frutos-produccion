import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: 59 }
    });
    
    if (!carta) {
      console.log('❌ No se encontró carta');
      await prisma.$disconnect();
      process.exit(1);
    }
    
    console.log('📄 Estado actual:', carta.estado);
    
    const updated = await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: { 
        estado: 'EN_REVISION',
        fechaActualizacion: new Date()
      }
    });
    
    console.log('✅ Carta actualizada a:', updated.estado);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
