const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMagali() {
  try {
    // Buscar usuario
    const user = await prisma.usuario.findFirst({
      where: { email: 'ibarramagali189@gmail.com' },
      select: { 
        id: true, 
        nombre: true, 
        email: true,
        organizationId: true,
        currentVisionLevel: true,
        createdAt: true
      }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 USUARIO:');
    console.log(user);
    
    // Buscar TODOS sus tickets
    const tickets = await prisma.ticket.findMany({
      where: { ownerId: user.id },
      include: {
        vision: { select: { id: true, nombre: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\n🎫 HISTORIAL DE TICKETS:');
    tickets.forEach((t, i) => {
      console.log(`\n--- Ticket ${i+1} ---`);
      console.log({
        id: t.id.substring(0, 8) + '...',
        level: t.level,
        type: t.type,
        status: t.status,
        paymentStatus: t.paymentStatus,
        vision: t.vision?.nombre || 'Sin visión',
        amountPaid: t.amountPaid,
        costAtPurchase: t.costAtPurchase,
        isTransferable: t.isTransferable,
        createdAt: t.createdAt?.toISOString().split('T')[0]
      });
    });
    
    // Buscar enrollments
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { userId: user.id },
      include: {
        Vision: { select: { id: true, nombre: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\n📋 HISTORIAL DE ENROLLMENTS:');
    enrollments.forEach((e, i) => {
      console.log(`\n--- Enrollment ${i+1} ---`);
      console.log({
        id: e.id,
        level: e.level,
        enrollmentStatus: e.enrollmentStatus,
        attendanceStatus: e.attendanceStatus,
        paymentStatus: e.paymentStatus,
        vision: e.Vision?.nombre || 'Sin visión',
        enrolledAt: e.enrolledAt?.toISOString().split('T')[0],
        completedAt: e.completedAt?.toISOString().split('T')[0] || null,
        graduatedAt: e.graduatedAt?.toISOString().split('T')[0] || null
      });
    });
    
    // Resumen
    console.log('\n📊 RESUMEN:');
    const activeTickets = tickets.filter(t => t.status === 'ACTIVE');
    const cancelledTickets = tickets.filter(t => t.status === 'CANCELLED');
    const totalPaid = tickets.reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);
    
    console.log(`  Total tickets: ${tickets.length}`);
    console.log(`  Tickets activos: ${activeTickets.length}`);
    console.log(`  Tickets cancelados: ${cancelledTickets.length}`);
    console.log(`  Total pagado: $${totalPaid}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMagali();
