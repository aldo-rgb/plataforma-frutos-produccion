const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar o crear usuario
  let user = await prisma.usuario.findUnique({
    where: { email: 'aldo@zero.com' }
  });
  
  if (!user) {
    user = await prisma.usuario.create({
      data: {
        email: 'aldo@zero.com',
        nombre: 'Aldo Pruebas',
        telefono: '32435543553',
        rol: 'PARTICIPANTE',
        organizationId: 3
      }
    });
    console.log('Usuario creado:', user.id);
  } else {
    console.log('Usuario encontrado:', user.id);
  }
  
  // Crear enrollment PL (Liderato)
  const enrollment = await prisma.vision_enrollments.create({
    data: {
      userId: user.id,
      visionId: 23,
      coordinatorId: 48,
      level: 'PL',
      enrollmentStatus: 'ENROLLED',
      updatedAt: new Date()
    }
  });
  console.log('Enrollment PL creado:', enrollment.id);
  
  // Crear ticket PL
  const ticket = await prisma.visionTicket.create({
    data: {
      visitorId: user.id,
      visionId: 23,
      ticketType: 'PL',
      paymentStatus: 'PAID',
      level: 'PL',
      nombre: 'Aldo Pruebas',
      precio: 0
    }
  });
  console.log('Ticket PL creado:', ticket.id);
  
  console.log('✅ Aldo Pruebas agregado a Vision 23 con nivel PL (Liderato)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
