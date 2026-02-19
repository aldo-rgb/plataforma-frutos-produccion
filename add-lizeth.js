const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar usuario
  let user = await prisma.usuario.findUnique({
    where: { email: 'navarrolt28@gmail.com' }
  });
  
  if (!user) {
    console.log('Usuario no encontrado, creándolo...');
    user = await prisma.usuario.create({
      data: {
        email: 'navarrolt28@gmail.com',
        nombre: 'Lizeth Yahaira Treviño Navarro',
        rol: 'PARTICIPANTE',
        organizationId: 3
      }
    });
    console.log('Usuario creado:', user.id, user.email);
  } else {
    console.log('Usuario encontrado:', user.id, user.email);
  }
  
  // Verificar si ya tiene enrollment
  const existingEnrollment = await prisma.vision_enrollments.findFirst({
    where: { userId: user.id, visionId: 23 }
  });
  
  if (existingEnrollment) {
    console.log('Ya tiene enrollment en Vision 23');
    return;
  }
  
  // Crear enrollment BASIC para Vision 23
  const enrollment = await prisma.vision_enrollments.create({
    data: {
      userId: user.id,
      visionId: 23,
      coordinatorId: 48,
      level: 'BASIC',
      enrollmentStatus: 'ENROLLED',
      updatedAt: new Date()
    }
  });
  console.log('Enrollment BASIC creado:', enrollment.id);
  
  // Crear ticket
  const ticket = await prisma.vision_tickets.create({
    data: {
      userId: user.id,
      visionId: 23,
      ticketType: 'BASIC',
      paymentStatus: 'PAID',
      updatedAt: new Date()
    }
  });
  console.log('Ticket BASIC creado:', ticket.id);
  
  console.log('✅ Lizeth Yahaira Treviño Navarro agregada a Vision 23 con BASIC');
}

main().catch(console.error).finally(() => prisma.$disconnect());
