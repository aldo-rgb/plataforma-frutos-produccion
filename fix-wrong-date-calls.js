// Script para eliminar las llamadas asignadas incorrectamente en AVANZADO
// Las llamadas se crearon para el día incorrecto (lunes 20 de enero)
// y deberían estar en los días 2, 3 y 4 del entrenamiento (21, 22, 23 de enero)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWrongDateCalls() {
  try {
    // Obtener la visión v1 gdl (id=2)
    const vision = await prisma.vision.findUnique({
      where: { id: 2 },
      select: {
        id: true,
        nombre: true,
        advancedStartDate: true,
      }
    });

    console.log('\n📋 Visión:', vision?.nombre);
    console.log('📅 Fecha inicio AVANZADO:', vision?.advancedStartDate?.toISOString());

    // Encontrar todos los slots de squads AVANZADOS de esta visión
    const wrongSlots = await prisma.gCCallSlot.findMany({
      where: {
        squad: {
          visionId: 2,
          level: 'ADVANCED',
          isActive: true,
        }
      },
      include: {
        participant: {
          select: { id: true, nombre: true }
        },
        squad: {
          select: { id: true, name: true, level: true }
        }
      }
    });

    console.log(`\n🔍 Slots encontrados en squads ADVANCED: ${wrongSlots.length}`);
    
    for (const slot of wrongSlots) {
      console.log(`- ${slot.participant?.nombre} (ID: ${slot.participant?.id})`);
      console.log(`  Fecha programada: ${slot.scheduledDate?.toISOString().split('T')[0]}`);
      console.log(`  Hora: ${slot.scheduledTime}`);
      console.log(`  Squad: ${slot.squad?.name || slot.squad?.id}`);
    }

    // Eliminar todos estos slots para que se puedan reasignar correctamente
    if (wrongSlots.length > 0) {
      const deleteResult = await prisma.gCCallSlot.deleteMany({
        where: {
          id: {
            in: wrongSlots.map(s => s.id)
          }
        }
      });
      console.log(`\n✅ Eliminados ${deleteResult.count} slots incorrectos`);
      console.log('\n⚠️ Ahora los Game Changers deben reasignar las llamadas desde la plataforma');
      console.log('Las nuevas asignaciones crearán slots para los días 21, 22 y 23 de enero');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixWrongDateCalls();
