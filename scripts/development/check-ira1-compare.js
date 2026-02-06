const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const userId = 33; // Regina ira1@zero.com
  
  // Ver tickets
  console.log('=== TICKETS ===');
  const tickets = await prisma.ticket.findMany({
    where: { ownerId: userId }
  });
  console.log(`Total tickets: ${tickets.length}`);
  for (const t of tickets) {
    console.log(`  🎟️ Ticket ${t.id}: Level=${t.level}, Status=${t.status}, Type=${t.type}`);
  }
  
  // Ver VisionParticipante
  console.log('\n=== VISION PARTICIPANTE ===');
  const vp = await prisma.visionParticipante.findMany({
    where: { participanteId: userId }
  });
  console.log(`Total registros: ${vp.length}`);
  for (const v of vp) {
    console.log(`  👤 VisionId=${v.visionId}, Level=${v.level}, HasPaid=${v.hasPaid}, Abono=${v.abonoAmount}`);
  }
  
  // Ver VisionGameChanger (por si tiene rol de GC)
  console.log('\n=== VISION GAMECHANGER ===');
  const vgc = await prisma.visionGameChanger.findMany({
    where: { gameChangerId: userId }
  });
  console.log(`Total registros: ${vgc.length}`);
  
  // Comparar con ira2@zero.com que SÍ aparece en advanced
  console.log('\n\n======= COMPARACIÓN CON ira2@zero.com =======');
  const ira2 = await prisma.usuario.findFirst({
    where: { email: 'ira2@zero.com' }
  });
  
  if (ira2) {
    console.log(`ID: ${ira2.id}, Nombre: ${ira2.nombre}`);
    
    const ira2Enrollments = await prisma.vision_enrollments.findMany({
      where: { userId: ira2.id }
    });
    console.log(`\nEnrollments de ira2:`);
    for (const e of ira2Enrollments) {
      console.log(`  - Level: ${e.level}, Status: ${e.attendanceStatus}`);
    }
    
    const ira2VP = await prisma.visionParticipante.findMany({
      where: { participanteId: ira2.id }
    });
    console.log(`\nVisionParticipante de ira2:`);
    for (const v of ira2VP) {
      console.log(`  - VisionId=${v.visionId}, Level=${v.level}, HasPaid=${v.hasPaid}`);
    }
    
    const ira2Tickets = await prisma.ticket.findMany({
      where: { ownerId: ira2.id }
    });
    console.log(`\nTickets de ira2: ${ira2Tickets.length}`);
    for (const t of ira2Tickets) {
      console.log(`  🎟️ Level=${t.level}, Status=${t.status}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
