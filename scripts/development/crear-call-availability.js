const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarYCrearDisponibilidad() {
  try {
    const mentorId = 8;
    
    console.log('🔍 Verificando disponibilidad del mentor ID:', mentorId);
    
    // Verificar CallAvailability
    const callAvail = await prisma.callAvailability.findMany({
      where: {
        mentorId: mentorId,
        type: 'DISCIPLINE',
        isActive: true
      }
    });
    
    console.log('📊 CallAvailability:', callAvail.length, 'registros');
    
    if (callAvail.length === 0) {
      console.log('⚙️ Creando disponibilidad en CallAvailability...');
      
      // Crear disponibilidad Lunes a Viernes, 5:00 - 20:00
      for (let dia = 1; dia <= 5; dia++) {
        await prisma.callAvailability.create({
          data: {
            mentorId: mentorId,
            dayOfWeek: dia,
            startTime: '05:00',
            endTime: '20:00',
            type: 'DISCIPLINE',
            isActive: true
          }
        });
      }
      
      console.log('✅ Disponibilidad creada exitosamente');
      console.log('   Días: Lunes a Viernes (1-5)');
      console.log('   Horario: 05:00 - 20:00');
      console.log('   Slots cada 20 minutos');
    } else {
      console.log('✅ El mentor ya tiene disponibilidad configurada:');
      callAvail.forEach((avail, i) => {
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        console.log(`   ${i + 1}. ${dias[avail.dayOfWeek]}: ${avail.startTime} - ${avail.endTime}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarYCrearDisponibilidad();
