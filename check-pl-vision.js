const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const now = new Date();
  const orgId = 2; // Organización de Irasema
  
  // Qué visión tiene PL habilitado con plWeekend1StartDate >= now
  const nextPLVision = await prisma.vision.findFirst({
    where: {
      organizationId: orgId,
      isActive: true,
      plWeekend1StartDate: { gte: now },
      enabledLevels: { has: 'PL' },
    },
    select: {
      id: true,
      nombre: true,
      plWeekend1StartDate: true,
      enabledLevels: true,
    },
    orderBy: {
      plWeekend1StartDate: 'asc',
    },
  });
  
  console.log('nextPLVision (búsqueda actual):', JSON.stringify(nextPLVision, null, 2));
  
  // Todas las visiones de esa org
  const allVisions = await prisma.vision.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      nombre: true,
      enabledLevels: true,
      plWeekend1StartDate: true,
      advancedStartDate: true,
    },
    orderBy: { id: 'asc' }
  });
  
  console.log('\nTodas las visiones de org 2:', JSON.stringify(allVisions, null, 2));
  
  await prisma.$disconnect();
}

check();
