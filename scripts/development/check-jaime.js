const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    // Buscar usuario
    const user = await prisma.usuario.findFirst({
      where: {
        nombre: { contains: 'Jaime', mode: 'insensitive' }
      },
      select: { 
        id: true, 
        nombre: true, 
        email: true,
        organizationId: true,
        currentVisionLevel: true
      }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 Usuario:', user);
    
    // Buscar sus tickets
    const tickets = await prisma.ticket.findMany({
      where: { ownerId: user.id },
      include: {
        vision: { select: { id: true, nombre: true } }
      }
    });
    
    console.log('\n🎫 Tickets:');
    tickets.forEach(t => {
      console.log({
        id: t.id,
        level: t.level,
        status: t.status,
        paymentStatus: t.paymentStatus,
        vision: t.vision?.nombre,
        amountPaid: t.amountPaid,
        costAtPurchase: t.costAtPurchase
      });
    });
    
    // Buscar enrollments
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { userId: user.id },
      include: {
        vision: { select: { id: true, nombre: true } }
      }
    });
    
    console.log('\n📋 Enrollments:');
    enrollments.forEach(e => {
      console.log({
        id: e.id,
        level: e.level,
        status: e.status,
        vision: e.vision?.nombre
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
