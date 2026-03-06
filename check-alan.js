const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar usuario Alan Jhair
  const users = await prisma.usuario.findMany({
    where: {
      OR: [
        { nombre: { contains: 'Alan', mode: 'insensitive' } },
        { nombre: { contains: 'Jhair', mode: 'insensitive' } }
      ]
    },
    select: { id: true, nombre: true, email: true, rol: true, organizationId: true }
  });
  
  console.log('Usuarios encontrados:', JSON.stringify(users, null, 2));
  
  for (const user of users) {
    // Buscar asignaciones de VisionGameChanger
    const gcAssignments = await prisma.visionGameChanger.findMany({
      where: { gameChangerId: user.id },
      include: { Vision: { select: { id: true, nombre: true } } }
    });
    console.log(`\nAsignaciones GC para ${user.nombre} (ID: ${user.id}):`, JSON.stringify(gcAssignments, null, 2));
    
    // Buscar squads donde es líder
    const squads = await prisma.smallGroup.findMany({
      where: { leaderId: user.id },
      select: { id: true, name: true, level: true, visionId: true }
    });
    console.log(`Squads:`, JSON.stringify(squads, null, 2));
  }
  
  // Buscar visiones de Monterrey
  const visions = await prisma.vision.findMany({
    where: {
      Organization: { name: { contains: 'Monterrey', mode: 'insensitive' } }
    },
    select: { id: true, nombre: true, isActive: true, organizationId: true }
  });
  console.log('\nVisiones de Monterrey:', JSON.stringify(visions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
