const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar al participante Alex Garza
  const participant = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Alex' } },
    select: { id: true, nombre: true, email: true }
  });
  console.log('Participante:', participant);

  if (participant) {
    // Buscar su membresía en squad
    const membership = await prisma.smallGroupMember.findFirst({
      where: { userId: participant.id, isActive: true },
      include: {
        group: {
          include: {
            leader: { select: { id: true, nombre: true, email: true } }
          }
        }
      }
    });
    
    if (membership) {
      console.log('Squad:', membership.group.name, membership.group.id);
      console.log('Leader (GC):', membership.group.leader);
      console.log('Squad isActive:', membership.group.isActive);
      
      // Verificar disponibilidad del líder real
      const leaderAvail = await prisma.gCAvailability.findMany({
        where: { gameChangerId: membership.group.leader.id, isActive: true }
      });
      console.log('Disponibilidad del líder:', leaderAvail.length, leaderAvail);
    } else {
      console.log('No tiene membresía activa');
    }
  }

  await prisma.$disconnect();
}
check();
