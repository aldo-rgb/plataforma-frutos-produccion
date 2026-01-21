const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const userId = 30; // Irasema
  
  // Simular lo que hace upgrade-advanced-info
  const allEnrollments = await prisma.vision_enrollments.findMany({
    where: {
      userId: userId,
      enrollmentStatus: { in: ['ACTIVE', 'ENROLLED', 'PENDING'] },
    },
    include: {
      Vision: {
        include: {
          Organization: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
  
  const advancedEnrollment = allEnrollments.find(e => e.level === 'ADVANCED');
  console.log('Advanced Enrollment:');
  console.log('  - ID:', advancedEnrollment?.id);
  console.log('  - Vision ID:', advancedEnrollment?.visionId);
  console.log('  - Vision Name:', advancedEnrollment?.Vision?.nombre);
  console.log('  - Org ID:', advancedEnrollment?.Vision?.organizationId);
  
  // Qué visión se devuelve como nextPLVision
  const now = new Date();
  const orgId = advancedEnrollment?.Vision?.organizationId;
  
  const nextPLVision = orgId ? await prisma.vision.findFirst({
    where: {
      organizationId: orgId,
      isActive: true,
      plWeekend1StartDate: { gte: now },
      enabledLevels: { has: 'PL' },
    },
    select: { id: true, nombre: true },
    orderBy: { plWeekend1StartDate: 'asc' },
  }) : null;
  
  console.log('\nnextPLVision que retorna el API:');
  console.log('  - ID:', nextPLVision?.id);
  console.log('  - Name:', nextPLVision?.nombre);
  
  // Ahora simular el checkout - qué pasa cuando se llama enroll-advanced
  console.log('\n--- SIMULACIÓN DE CHECKOUT ---');
  console.log('Si se envía visionId:', nextPLVision?.id);
  
  // Verificar que existe enrollment ADVANCED en ESA visión
  const checkAdvanced = await prisma.vision_enrollments.findFirst({
    where: {
      userId: userId,
      visionId: nextPLVision?.id,
      level: 'ADVANCED',
    },
  });
  
  console.log('¿Existe ADVANCED en esa visión?', checkAdvanced ? 'SÍ' : 'NO ❌');
  if (!checkAdvanced) {
    console.log('  ESTE ES EL BUG: El API busca ADVANCED en visionId=' + nextPLVision?.id);
    console.log('  Pero Irasema tiene ADVANCED en visionId=' + advancedEnrollment?.visionId);
  }
  
  await prisma.$disconnect();
}

debug();
