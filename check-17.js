const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Esto es lo que usa pl-enrollments
  const enrollments = await prisma.vision_enrollments.findMany({
    where: {
      visionId: 13,
      level: 'PL',
      enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }  // Puede que filtre por estos
    }
  });
  console.log('PL con ENROLLED o ACTIVE:', enrollments.length);
  
  // O quizás excluye PENDING
  const notPending = await prisma.vision_enrollments.findMany({
    where: {
      visionId: 13,
      level: 'PL',
      enrollmentStatus: { not: 'PENDING' }
    }
  });
  console.log('PL sin PENDING:', notPending.length);
  
  // Ver los que están en signupFormId (vienen del signup)
  const fromSignup = await prisma.vision_enrollments.findMany({
    where: {
      visionId: 13,
      level: 'PL',
      signupFormId: { not: null }
    }
  });
  console.log('PL desde signup:', fromSignup.length);
  
  await prisma.$disconnect();
}

check().catch(console.error);
