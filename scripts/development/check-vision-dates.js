const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVisionDates() {
  try {
    const vision = await prisma.vision.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      }
    });

    console.log('\n=== DATOS DE LA VISIÓN ===');
    console.log('ID:', vision.id);
    console.log('Nombre:', vision.nombre);
    console.log('Start Date:', vision.startDate);
    console.log('End Date:', vision.endDate);
    console.log('Created At:', vision.createdAt);
    console.log('\n=== ANÁLISIS ===');
    console.log('¿Tiene startDate?', vision.startDate !== null);
    console.log('¿Tiene endDate?', vision.endDate !== null);
    
    if (vision.startDate) {
      console.log('StartDate ISO:', vision.startDate.toISOString());
    }
    if (vision.endDate) {
      console.log('EndDate ISO:', vision.endDate.toISOString());
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVisionDates();
