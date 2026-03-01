const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const userId = 1;
  
  try {
    const regs = await prisma.advancedPreRegistration.findMany({
      where: { userId: userId },
      select: {
        id: true,
        status: true,
        SchoolProduct_AdvancedPreRegistration_currentProductIdToSchoolProduct: {
          select: { id: true, name: true }
        }
      }
    });
    console.log('AdvancedPreRegistration OK:', regs.length);
  } catch (error) {
    console.error('Error AdvancedPreRegistration:', error.message);
  }
  
  await prisma.$disconnect();
}
test();
