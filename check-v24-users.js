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
  
  let withEnrollment = 0;
  let withTicket = 0;
  let withCheckIn = 0;
  
  for (const email of emails) {
    const user = await prisma.usuario.findFirst({
      where: { email },
      include: {
        vision_enrollment: {
          where: { visionId: VISION_ID }
        },
        ownedTickets: {
          where: { visionId: VISION_ID }
        },
        checkIns: {
          where: { visionId: VISION_ID }
        }
      }
    });
    
    if (!user) {
      console.log('❌ No encontrado: ' + email);
      continue;
    }
    
    const hasEnrollment = user.vision_enrollment.length > 0;
    const hasTicket = user.ownedTickets.length > 0;
    const hasCheckIn = user.checkIns.length > 0;
    
    if (hasEnrollment) withEnrollment++;
    if (hasTicket) withTicket++;
    if (hasCheckIn) withCheckIn++;
    
    const enrollment = hasEnrollment ? user.vision_enrollment[0] : null;
    const ticket = hasTicket ? user.ownedTickets[0] : null;
    
    console.log('ID ' + user.id + ' | ' + user.nombre);
    console.log('  📋 Enrollment: ' + (hasEnrollment ? 'SÍ (' + enrollment.enrollmentStatus + ', ' + enrollment.level + ')' : 'NO'));
    console.log('  🎫 Ticket: ' + (hasTicket ? 'SÍ (' + ticket.paymentStatus + ', $' + ticket.purchasePrice + ')' : 'NO'));
    console.log('  ✅ Check-in: ' + (hasCheckIn ? 'SÍ' : 'NO'));
    console.log('');
  }
  
  console.log('=== RESUMEN ===');
  console.log('Total usuarios encontrados: ' + emails.length);
  console.log('Con enrollment en V24: ' + withEnrollment);
  console.log('Con ticket en V24: ' + withTicket);
  console.log('Con check-in en V24: ' + withCheckIn);
  
  await prisma.$disconnect();
}

main();
