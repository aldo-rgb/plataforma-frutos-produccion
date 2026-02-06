const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'emi062298@gmail.com' }
  });
  
  if (!user) {
    console.log('Usuario no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Usuario:', user.nombre, '(ID:', user.id + ')');
  
  const enrollments = await prisma.vision_enrollments.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      level: true,
      enrollmentStatus: true,
      attendanceStatus: true,
      paymentStatus: true,
      visionId: true,
      droppedAt: true
    }
  });
  
  console.log('\nEnrollments:');
  enrollments.forEach(e => {
    console.log(JSON.stringify(e, null, 2));
  });
  
  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
