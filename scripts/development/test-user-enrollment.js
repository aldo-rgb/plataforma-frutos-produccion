const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.usuario.findFirst({
      where: { email: 'zero1@zero.com' },
      select: { id: true, email: true, nombre: true }
    });
    console.log('Usuario:', JSON.stringify(user));
    
    if (user) {
      const enrollments = await prisma.vision_enrollments.findMany({
        where: { userId: user.id },
        include: {
          Vision: { select: { id: true, nombre: true, organizationId: true } }
        }
      });
      console.log('Enrollments:', JSON.stringify(enrollments, null, 2));
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test().then(() => console.log('DONE'));
