const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeGame3FromParticipante() {
  try {
    console.log('🔍 Eliminando game3@quanter.com de VisionParticipante...\n');
    
    // Verificar primero
    const registros = await prisma.visionParticipante.findMany({
      where: { 
        participanteId: 31,
        visionId: 6 // Quanter V3
      },
      include: {
        Vision: { select: { nombre: true } }
      }
    });

    console.log(`Encontrados ${registros.length} registro(s) en VisionParticipante:`);
    registros.forEach(r => {
      console.log(`  - Visión: ${r.Vision.nombre}, participanteId: ${r.participanteId}, gameChangerId: ${r.gameChangerId}`);
    });

    if (registros.length === 0) {
      console.log('\n✅ No hay registros para eliminar');
      return;
    }

    // Eliminar solo el registro donde es participante (no gameChanger)
    const resultado = await prisma.visionParticipante.deleteMany({
      where: {
        participanteId: 31,
        visionId: 6,
        gameChangerId: null // Solo eliminar si NO es el registro de GameChanger
      }
    });

    console.log(`\n✅ Eliminados ${resultado.count} registro(s)`);

    // Verificar que sigue en VisionGameChanger
    const enGameChanger = await prisma.visionParticipante.count({
      where: {
        gameChangerId: 31,
        visionId: 6
      }
    });

    console.log(`\n✅ Sigue registrado como GameChanger: ${enGameChanger > 0 ? 'SÍ' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeGame3FromParticipante();
