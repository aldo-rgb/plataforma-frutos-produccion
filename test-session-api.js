const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sessionId = 'cmko8vrbr0001lpkncistn9vg';
  
  const crossingSession = await prisma.crossingSession.findUnique({
    where: { id: sessionId },
    include: {
      product: {
        select: { 
          id: true, 
          name: true, 
          organizationId: true
        }
      }
    }
  });
  
  if (!crossingSession) {
    console.log('Sesion no encontrada');
    return;
  }
  
  console.log('=== SESION ENCONTRADA ===');
  console.log('Product ID:', crossingSession.productId);
  console.log('Org ID:', crossingSession.product.organizationId);
  
  const orgVisions = await prisma.vision.findMany({
    where: { organizationId: crossingSession.product.organizationId },
    select: { id: true }
  });
  const visionIds = orgVisions.map(v => v.id);
  console.log('Visiones:', visionIds);
  
  const checkedInUsers = await prisma.checkInRecord.findMany({
    where: { productId: crossingSession.productId },
    select: {
      userId: true,
      Usuario: { select: { id: true, nombre: true } }
    },
    distinct: ['userId']
  });
  
  console.log('Check-ins:', checkedInUsers.length);
  
  const plTicketHolders = visionIds.length > 0 ? await prisma.ticket.findMany({
    where: {
      visionId: { in: visionIds },
      level: 'PL',
      status: 'ACTIVE',
      paymentStatus: { in: ['PAID', 'GIFT'] }
    },
    select: { ownerId: true }
  }) : [];
  
  const plTicketUserIds = new Set(plTicketHolders.map(p => p.ownerId));
  console.log('PL Ticket user IDs:', [...plTicketUserIds]);
  
  const waitingParticipants = checkedInUsers
    .filter(u => !plTicketUserIds.has(u.userId));
  
  console.log('\nWaiting (no tienen PL):', waitingParticipants.length);
  waitingParticipants.forEach(u => console.log('  -', u.userId, u.Usuario.nombre));
  
  await prisma.$disconnect();
}

check().catch(console.error);
