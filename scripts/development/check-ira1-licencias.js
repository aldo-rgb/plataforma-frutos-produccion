const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Buscar licencias ADVANCED del producto 20 (el producto advanced de visión 2)
  console.log('=== LICENCIAS DEL PRODUCTO ADVANCED (ID 20) ===');
  const licencias = await prisma.userLicense.findMany({
    where: { productId: 20 },
    include: {
      Usuario: { select: { id: true, nombre: true, email: true } }
    }
  });
  
  console.log(`Total licencias: ${licencias.length}`);
  for (const l of licencias) {
    console.log(`  🎫 ${l.Usuario?.email} (${l.Usuario?.nombre}) - Status: ${l.status}`);
  }
  
  // Buscar si hay algún registro con el email o nombre de Regina
  console.log('\n=== BUSCAR LICENCIAS DE REGINA ===');
  const reginaLicencias = await prisma.userLicense.findMany({
    where: {
      Usuario: {
        OR: [
          { nombre: { contains: 'Regina' } },
          { email: { contains: 'ira1' } }
        ]
      }
    },
    include: {
      Usuario: { select: { nombre: true, email: true } }
    }
  });
  console.log(`Licencias encontradas: ${reginaLicencias.length}`);
  
  // Ver tickets que pueda tener
  console.log('\n=== TICKETS DE REGINA (userId 33) ===');
  const tickets = await prisma.ticket.findMany({
    where: { userId: 33 }
  });
  console.log(`Total tickets: ${tickets.length}`);
  for (const t of tickets) {
    console.log(`  🎟️ Ticket ${t.id}: Level=${t.level}, Status=${t.status}, Type=${t.ticketType}`);
  }
  
  // Ver VisionParticipante
  console.log('\n=== VISION PARTICIPANTE ===');
  const vp = await prisma.visionParticipante.findMany({
    where: { participanteId: 33 }
  });
  console.log(`Total registros: ${vp.length}`);
  for (const v of vp) {
    console.log(`  👤 VisionId=${v.visionId}, Level=${v.level}, HasPaid=${v.hasPaid}, Abono=${v.abonoAmount}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
