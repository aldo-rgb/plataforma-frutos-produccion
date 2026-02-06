// Verificar datos desde las tablas exactas que usa el API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('=== CHECKIN RECORDS ===');
  const checkins = await prisma.checkInRecord.findMany({
    take: 5,
    select: {
      userId: true,
      productId: true,
      Usuario: {
        select: {
          id: true,
          nombre: true,
          profileImage: true
        }
      }
    }
  });
  checkins.forEach(c => {
    console.log(`User ${c.userId} (${c.Usuario.nombre}): profileImage = ${c.Usuario.profileImage ? 'SÍ (' + c.Usuario.profileImage.substring(0, 30) + '...)' : 'NO'}`);
  });

  console.log('\n=== ADVANCED PRE-REGISTRATIONS ===');
  const preRegs = await prisma.advancedPreRegistration.findMany({
    take: 5,
    select: {
      userId: true,
      status: true,
      user: {
        select: {
          id: true,
          nombre: true,
          profileImage: true
        }
      }
    }
  });
  preRegs.forEach(p => {
    console.log(`User ${p.userId} (${p.user.nombre}) status=${p.status}: profileImage = ${p.user.profileImage ? 'SÍ (' + p.user.profileImage.substring(0, 30) + '...)' : 'NO'}`);
  });

  console.log('\n=== TICKETS (PL) ===');
  const tickets = await prisma.ticket.findMany({
    where: { level: 'PL' },
    take: 5,
    select: {
      ownerId: true,
      status: true,
      owner: {
        select: {
          id: true,
          nombre: true,
          profileImage: true
        }
      }
    }
  });
  tickets.forEach(t => {
    console.log(`Owner ${t.ownerId} (${t.owner.nombre}) ticket=${t.status}: profileImage = ${t.owner.profileImage ? 'SÍ (' + t.owner.profileImage.substring(0, 30) + '...)' : 'NO'}`);
  });

  await prisma.$disconnect();
}

checkData();
