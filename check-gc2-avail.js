const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar el GC 'game 2'
  const gc = await prisma.usuario.findFirst({
    where: { nombre: 'game 2' },
    select: { id: true, nombre: true, email: true }
  });
  console.log('GC:', gc);

  if (gc) {
    // Buscar su disponibilidad
    const avail = await prisma.gCAvailability.findMany({
      where: { gameChangerId: gc.id },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true, isActive: true }
    });
    console.log('Disponibilidades:', avail.length, avail);

    // Buscar sus squads
    const squads = await prisma.smallGroup.findMany({
      where: { leaderId: gc.id },
      select: { id: true, name: true, isActive: true }
    });
    console.log('Squads:', squads);
  }

  await prisma.$disconnect();
}
check();
