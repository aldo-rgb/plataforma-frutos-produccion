const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIrasema() {
  // Buscar a Irasema
  const user = await prisma.usuario.findFirst({
    where: {
      OR: [
        { nombre: { contains: 'Irasema', mode: 'insensitive' } },
        { email: { contains: 'irasema', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      currentVisionLevel: true,
      organizationId: true
    }
  });
  
  if (!user) {
    console.log('No encontrado con Irasema, buscando Leyva...');
    const user2 = await prisma.usuario.findFirst({
      where: { nombre: { contains: 'Leyva', mode: 'insensitive' } },
      select: { id: true, nombre: true, email: true, currentVisionLevel: true, organizationId: true }
    });
    if (user2) {
      console.log('Usuario Leyva:', JSON.stringify(user2, null, 2));
    }
    await prisma.$disconnect();
    return;
  }
  
  console.log('Usuario:', JSON.stringify(user, null, 2));
  
  // Buscar sus enrollments
  const enrollments = await prisma.vision_enrollments.findMany({
    where: { userId: user.id },
    include: {
      Vision: { select: { id: true, nombre: true } }
    },
    orderBy: { visionId: 'asc' }
  });
  
  console.log('\nEnrollments:', JSON.stringify(enrollments.map(e => ({
    id: e.id,
    visionId: e.visionId,
    visionNombre: e.Vision?.nombre,
    level: e.level,
    enrollmentStatus: e.enrollmentStatus,
    paymentStatus: e.paymentStatus,
    attendanceStatus: e.attendanceStatus
  })), null, 2));
  
  // Buscar sus tickets
  const tickets = await prisma.ticket.findMany({
    where: { ownerId: user.id }
  });
  
  console.log('\nTickets:', JSON.stringify(tickets.map(t => ({
    id: t.id,
    visionId: t.visionId,
    level: t.level,
    status: t.status,
    paymentStatus: t.paymentStatus
  })), null, 2));
  
  await prisma.$disconnect();
}

checkIrasema();
