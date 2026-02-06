const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function moveJaime() {
  try {
    const userId = 124; // Jaime Hernández Trinidad
    
    // Buscar Vision 24
    const vision24 = await prisma.vision.findFirst({
      where: { nombre: { contains: '24' } }
    });
    
    console.log('🎯 Vision destino:', vision24);
    
    // Actualizar ticket ADVANCED a Vision 24
    const advancedTicket = await prisma.ticket.update({
      where: { id: '97320cc5-d494-4362-ba6e-fd497accb66a' },
      data: { visionId: vision24.id }
    });
    console.log('✅ Ticket ADVANCED movido a Vision 24');
    
    // Actualizar ticket PL a Vision 24 y marcarlo como PAGADO
    const plTicket = await prisma.ticket.update({
      where: { id: '5a64e09a-db2e-40fb-a445-eafd3d09040d' },
      data: { 
        visionId: vision24.id,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        amountPaid: 5500
      }
    });
    console.log('✅ Ticket PL movido a Vision 24 y marcado como PAGADO');
    
    // Actualizar enrollments
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { userId: userId }
    });
    
    for (const enrollment of enrollments) {
      await prisma.vision_enrollments.update({
        where: { id: enrollment.id },
        data: { visionId: vision24.id }
      });
      console.log(`✅ Enrollment ${enrollment.level} movido a Vision 24`);
    }
    
    // Verificar estado final
    const tickets = await prisma.ticket.findMany({
      where: { ownerId: userId },
      include: { vision: { select: { nombre: true } } }
    });
    
    console.log('\n📋 Estado final de tickets:');
    tickets.forEach(t => {
      console.log({
        level: t.level,
        status: t.status,
        paymentStatus: t.paymentStatus,
        vision: t.vision?.nombre,
        amountPaid: t.amountPaid
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

moveJaime();
