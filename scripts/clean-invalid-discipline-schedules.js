const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInvalidDisciplineSchedules() {
  try {
    console.log('🔍 Buscando horarios de DISCIPLINE fuera del rango 05:00-08:00...\n');
    
    const allSchedules = await prisma.callAvailability.findMany({
      where: { type: 'DISCIPLINE' },
      include: {
        Usuario: {
          select: { nombre: true, email: true }
        }
      }
    });

    const toDelete = [];
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    allSchedules.forEach(s => {
      const startHour = parseInt(s.startTime.split(':')[0]);
      const endHour = parseInt(s.endTime.split(':')[0]);
      
      if (startHour < 5 || endHour > 8) {
        toDelete.push(s);
        console.log(`  ❌ ID: ${s.id} | ${s.Usuario.nombre} | ${days[s.dayOfWeek]} | ${s.startTime}-${s.endTime} (fuera de rango)`);
      }
    });

    console.log(`\n📊 Total encontrados: ${toDelete.length} horarios inválidos de ${allSchedules.length} totales\n`);

    if (toDelete.length > 0) {
      const deleted = await prisma.callAvailability.deleteMany({
        where: {
          id: { in: toDelete.map(s => s.id) }
        }
      });
      
      console.log(`✅ Eliminados ${deleted.count} horarios inválidos`);
      console.log('\n💡 Los mentores deben volver a configurar sus horarios del Club de las 5 AM en el rango permitido: 05:00-08:00');
    } else {
      console.log('✅ No hay horarios inválidos para eliminar');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanInvalidDisciplineSchedules();
