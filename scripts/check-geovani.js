const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Geovani' } },
    select: { id: true, nombre: true, email: true }
  });
  
  if (!user) {
    console.log('Usuario no encontrado');
    process.exit(0);
  }
  
  console.log('Usuario:', user);
  
  const tickets = await prisma.ticket.findMany({
    where: { ownerId: user.id },
    include: {
      Vision: { select: { id: true, nombre: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log('\nHistorial de Tickets (ordenado por fecha):');
  tickets.forEach(t => {
    console.log('  ' + t.createdAt.toISOString().split('T')[0] + ' | ' + t.level + ' | Vision: ' + t.Vision?.nombre + ' (ID:' + t.visionId + ')');
    console.log('    Type: ' + t.type + ' | Status: ' + t.status + ' | Payment: ' + t.paymentStatus);
    console.log('    Cost: $' + t.costAtPurchase + ', Paid: $' + t.amountPaid);
  });
  
  const enrollments = await prisma.vision_enrollments.findMany({
    where: { userId: user.id },
    include: { Vision: { select: { id: true, nombre: true } } },
    orderBy: { enrolledAt: 'asc' }
  });
  
  console.log('\nHistorial de Enrollments (ordenado por fecha):');
  enrollments.forEach(e => {
    const fecha = e.enrolledAt ? e.enrolledAt.toISOString().split('T')[0] : 'N/A';
    console.log('  ' + fecha + ' | ' + e.level + ' | Vision: ' + e.Vision?.nombre + ' (ID:' + e.visionId + ') | Attendance: ' + e.attendanceStatus);
  });
  
  process.exit(0);
}

check();
