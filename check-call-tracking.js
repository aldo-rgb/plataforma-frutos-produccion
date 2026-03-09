const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Vision 24 (que es Vision 26 en nombre)
  const visionId = 24;
  
  // Ver enrollments con nivel BASIC
  const enrollments = await prisma.vision_enrollments.findMany({
    where: {
      visionId: visionId,
      level: 'BASIC'
    },
    include: {
      Usuario_vision_enrollments_userIdToUsuario: {
        select: { id: true, nombre: true, telefono: true }
      },
      BasicCallTracking: true
    }
  });
  
  console.log('Enrollments BASIC en Vision 24 (Vision 26):');
  console.log('Total:', enrollments.length);
  
  // Ver cuántos tienen BasicCallTracking
  const withTracking = enrollments.filter(e => e.BasicCallTracking);
  const withoutTracking = enrollments.filter(e => !e.BasicCallTracking);
  
  console.log('Con BasicCallTracking:', withTracking.length);
  console.log('Sin BasicCallTracking:', withoutTracking.length);
  
  console.log('\nPrimeros 3 enrollments:');
  enrollments.slice(0,3).forEach(e => {
    console.log({
      enrollmentId: e.id,
      userId: e.userId,
      nombre: e.Usuario_vision_enrollments_userIdToUsuario?.nombre,
      hasTracking: !!e.BasicCallTracking
    });
  });
  
  await prisma.$disconnect();
}
check();
