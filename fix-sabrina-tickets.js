const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSabrina() {
  try {
    // Buscar usuario Sabrina
    const user = await prisma.usuario.findFirst({
      where: { nombre: { contains: 'Sabrina', mode: 'insensitive' } },
      select: { id: true, nombre: true }
    });
    
    if (!user) {
      console.log('❌ Usuario Sabrina no encontrado');
      return;
    }
    
    console.log('👤 Usuario:', user);
    
    // Buscar sus tickets de ADVANCED
    const tickets = await prisma.ticket.findMany({
      where: {
        ownerId: user.id,
        level: 'ADVANCED'
      },
      include: {
        vision: { select: { nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n🎫 Tickets ADVANCED de Sabrina:');
    tickets.forEach(t => {
      console.log({
        id: t.id,
        status: t.status,
        type: t.type,
        vision: t.vision?.nombre,
        paymentStatus: t.paymentStatus,
        amountPaid: t.amountPaid,
        createdAt: t.createdAt
      });
    });
    
    // Encontrar el ticket de reposición (SCHOLARSHIP) y el original
    const repoTicket = tickets.find(t => t.type === 'SCHOLARSHIP');
    const originalTicket = tickets.find(t => t.type !== 'SCHOLARSHIP' && t.status !== 'CANCELLED');
    
    if (originalTicket && repoTicket) {
      console.log('\n🔄 Cancelando ticket original...');
      await prisma.ticket.update({
        where: { id: originalTicket.id },
        data: { status: 'CANCELLED' }
      });
      console.log(`✅ Ticket ${originalTicket.id} cancelado`);
    } else if (!originalTicket) {
      console.log('\n✅ No hay ticket original activo que cancelar');
    } else {
      console.log('\n⚠️ No se encontró ticket de reposición');
    }
    
    // Mostrar estado final
    const finalTickets = await prisma.ticket.findMany({
      where: {
        ownerId: user.id,
        level: 'ADVANCED'
      },
      include: {
        vision: { select: { nombre: true } }
      }
    });
    
    console.log('\n📋 Estado final:');
    finalTickets.forEach(t => {
      console.log({
        id: t.id.substring(0, 8),
        status: t.status,
        type: t.type,
        vision: t.vision?.nombre
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSabrina();
