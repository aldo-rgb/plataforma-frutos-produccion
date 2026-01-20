const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const emails = [
  'r.facundo8373@gmail.com',
  'jose.jcg2002@gmail.com',
  'segiguerrero@gmail.com',
  'zairaalcalaramos@gmail.com',
  'fer.rp.0105@gmail.com',
  'egonzalezortega60@gmail.com',
  'lindavaldes240@gmail.com',
  'lizethdeandac@gmail.com',
  'perlanieves79@icloud.com',
  'josefinasama1@gmail.com',
  'arriaga.oralia@gmail.com',
  'miry_rodriguezhdz@hotmail.com',
  'guillermo.enrique99@outlook.com',
  'diaz.espinosa.7@gmail.com',
  'juanarevalo92@gmail.com',
  'arturocortezcastillo1@gmail.com',
  'mariaangelahdzreyna@gmail.com',
  'violetacolunga2011@hotmail.com',
  'diana_95cb@hotmail.com',
  'jorgead1604@gmail.com',
  'julio.alanis@hotmail.com',
  'cruzlopez31@icloud.com',
  'atencionvyt@yahoo.com.mx',
  'raquel.briones@hotmail.com',
  'toyomaria660@gmail.com',
  'espinoinocencia@yahoo.com.mx',
  'colungadri@hotmail.com',
  'mitovar84@gmail.com',
  'dora-martinez@live.com',
  'lupytacardenasc@yahoo.com.mx'
];

const VISION_ID = 5;

async function main() {
  console.log('=== Verificando usuarios para Vision 24 ===\n');
  
  // Obtener IDs de usuarios
  const users = await prisma.usuario.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, nombre: true }
  });
  
  console.log('Usuarios encontrados: ' + users.length);
  
  const userIds = users.map(u => u.id);
  
  // Verificar enrollments
  const enrollments = await prisma.vision_enrollments.findMany({
    where: { 
      userId: { in: userIds },
      visionId: VISION_ID
    }
  });
  
  // Verificar tickets
  const tickets = await prisma.ticket.findMany({
    where: {
      ownerId: { in: userIds },
      visionId: VISION_ID
    }
  });
  
  console.log('Con enrollment V24: ' + enrollments.length);
  console.log('Con ticket V24: ' + tickets.length);
  
  // Mapear para cada usuario
  console.log('\n=== DETALLE POR USUARIO ===\n');
  
  for (const user of users) {
    const enrollment = enrollments.find(e => e.userId === user.id);
    const ticket = tickets.find(t => t.ownerId === user.id);
    
    console.log('ID ' + user.id + ' | ' + user.nombre);
    console.log('  📋 Enrollment: ' + (enrollment ? 'SÍ (' + enrollment.enrollmentStatus + ', ' + enrollment.level + ')' : 'NO'));
    console.log('  🎫 Ticket: ' + (ticket ? 'SÍ (' + ticket.paymentStatus + ', $' + ticket.purchasePrice + ')' : 'NO'));
    console.log('');
  }
  
  console.log('=== RESUMEN ===');
  const usersWithoutEnrollment = users.filter(u => !enrollments.find(e => e.userId === u.id));
  const usersWithoutTicket = users.filter(u => !tickets.find(t => t.ownerId === u.id));
  
  console.log('Sin enrollment: ' + usersWithoutEnrollment.length);
  console.log('Sin ticket: ' + usersWithoutTicket.length);
  
  if (usersWithoutEnrollment.length > 0) {
    console.log('\n=== USUARIOS SIN ENROLLMENT ===');
    usersWithoutEnrollment.forEach(u => console.log('  - ID ' + u.id + ' | ' + u.nombre));
  }
  
  if (usersWithoutTicket.length > 0) {
    console.log('\n=== USUARIOS SIN TICKET ===');
    usersWithoutTicket.forEach(u => console.log('  - ID ' + u.id + ' | ' + u.nombre));
  }
  
  await prisma.$disconnect();
}

main();
