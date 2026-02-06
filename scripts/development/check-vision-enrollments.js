const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Buscar la visión "Tu Vida en Equilibrio"
    const vision = await prisma.vision.findFirst({
      where: {
        nombre: { contains: 'Tu Vida en Equilibrio' }
      },
      select: {
        id: true,
        nombre: true,
        isActive: true,
        organizationId: true
      }
    });

    console.log('Visión encontrada:', vision);

    if (vision) {
      // Buscar enrollments de esta visión
      const enrollments = await prisma.vision_enrollments.findMany({
        where: { visionId: vision.id },
        select: {
          id: true,
          level: true,
          enrollmentStatus: true,
          userId: true
        }
      });

      console.log(`\nTotal enrollments: ${enrollments.length}`);
      
      // Agrupar por nivel y status
      const byLevel = {};
      const byStatus = {};
      
      enrollments.forEach(e => {
        byLevel[e.level] = (byLevel[e.level] || 0) + 1;
        byStatus[e.enrollmentStatus] = (byStatus[e.enrollmentStatus] || 0) + 1;
      });

      console.log('\nPor nivel:', byLevel);
      console.log('Por status:', byStatus);

      // Mostrar enrollments de PL
      const plEnrollments = enrollments.filter(e => e.level === 'PL');
      console.log(`\nEnrollments PL (${plEnrollments.length}):`, plEnrollments);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
