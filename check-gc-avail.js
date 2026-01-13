const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Ver todos los squads y sus líderes
  const squads = await prisma.smallGroup.findMany({
    where: { isActive: true },
    select: { 
      id: true, 
      name: true, 
      leaderId: true,
      leader: { select: { id: true, nombre: true } }
    }
  });
  console.log('Squads activos:', JSON.stringify(squads, null, 2));
  
  // Ver todas las disponibilidades
  const avails = await prisma.gCAvailability.findMany({
    where: { isActive: true },
    select: { gameChangerId: true, dayOfWeek: true, startTime: true, endTime: true }
  });
  console.log('\nDisponibilidades activas:', JSON.stringify(avails, null, 2));
  
  await prisma.$disconnect();
}
check();
