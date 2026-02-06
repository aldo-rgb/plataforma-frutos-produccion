const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarSesiones() {
  try {
    const sesiones = await prisma.callBooking.findMany({
      where: {
        studentId: 59,
        mentorId: 8,
        programEnrollmentId: null,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: 5
    });
    
    console.log('📅 Sesiones agendadas:', sesiones.length);
    
    if (sesiones.length > 0) {
      console.log('\n📋 Primeras 5 sesiones:');
      sesiones.forEach((s, i) => {
        const fecha = new Date(s.scheduledAt);
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        console.log(`${i + 1}. ${dias[fecha.getDay()]} ${fecha.toLocaleDateString('es-MX')} a las ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`);
      });
    } else {
      console.log('❌ No hay sesiones agendadas');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarSesiones();
