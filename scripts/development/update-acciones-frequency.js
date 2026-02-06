const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAccionesWithFrequency() {
  try {
    console.log('\n🔧 Actualizando acciones con frecuencia y días...\n');

    // Buscar todas las acciones del usuario Carlos (ID: 48)
    const acciones = await prisma.accion.findMany({
      where: {
        Meta: {
          CartaFrutos: {
            usuarioId: 48
          }
        }
      },
      include: {
        Meta: {
          include: {
            CartaFrutos: true
          }
        }
      }
    });

    console.log(`✅ Encontradas ${acciones.length} acciones\n`);

    // Diferentes configuraciones para variedad
    const frequencies = ['DAILY', 'WEEKLY', 'WEEKLY', 'BIWEEKLY'];
    const weeklyDays = [
      [1, 3, 5],      // Lun, Mié, Vie
      [2, 4],         // Mar, Jue
      [1, 2, 3, 4, 5], // Lunes a Viernes
      [1, 4]          // Lun, Jue
    ];

    for (let i = 0; i < acciones.length; i++) {
      const accion = acciones[i];
      
      // Asignar frecuencia ciclando por las opciones
      const frequency = frequencies[i % frequencies.length];
      
      let assignedDays;
      if (frequency === 'DAILY') {
        assignedDays = [0, 1, 2, 3, 4, 5, 6]; // Todos los días
      } else if (frequency === 'MONTHLY') {
        assignedDays = [1]; // Día 1 del mes
      } else {
        assignedDays = weeklyDays[i % weeklyDays.length];
      }

      await prisma.accion.update({
        where: { id: accion.id },
        data: {
          frequency: frequency,
          assignedDays: assignedDays
        }
      });

      console.log(`✅ Actualizada: "${accion.texto}"`);
      console.log(`   Frecuencia: ${frequency}`);
      console.log(`   Días: ${assignedDays.join(', ')}`);
      console.log(`   Área: ${accion.Meta.categoria}\n`);
    }

    console.log('🎉 ¡Todas las acciones actualizadas!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAccionesWithFrequency();
