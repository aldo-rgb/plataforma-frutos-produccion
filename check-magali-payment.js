const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'ibarramagali189@gmail.com' }
  });
  
  if (!user) {
    console.log('Usuario no encontrado');
    return;
  }
  
  console.log('Usuario:', user.nombre, '(ID:', user.id + ')');
  
  const enrollments = await prisma.vision_enrollments.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      level: true,
      enrollmentStatus: true,
      paymentStatus: true,
      visionId: true,
      createdAt: true
    }
  });
  
  console.log('\nEnrollments:');
  enrollments.forEach(e => {
    console.log(JSON.stringify({
      id: e.id,
      level: e.level,
      enrollmentStatus: e.enrollmentStatus,
      paymentStatus: e.paymentStatus,
      visionId: e.visionId
    }, null, 2));
  });
  
  await prisma.$disconnect();
}
check();
