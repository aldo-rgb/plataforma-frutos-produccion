const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Verificando slots de Mentor2 (ID: 14)...\n');
  
  const slots = await prisma.callAvailability.findMany({
    where: { 
      mentorId: 14,
      type: 'DISCIPLINE'
    },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' }
    ]
  });
  
  console.log('Total slots encontrados:', slots.length);
  
  if (slots.length > 0) {
    console.log('\nSlots disponibles:');
    slots.forEach(slot => {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      console.log(`- ${dias[slot.dayOfWeek]} a las ${slot.startTime} (activo: ${slot.isActive})`);
    });
  } else {
    console.log('❌ No hay slots configurados para este mentor');
  }
  
  await prisma.$disconnect();
}

check();
