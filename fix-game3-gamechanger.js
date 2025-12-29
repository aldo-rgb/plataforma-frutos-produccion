const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGame3AsGameChanger() {
  try {
    console.log('🔧 Reparando game3@quanter.com como GameChanger...\n');
    
    const userId = 31;
    const visionId = 6; // Quanter V3

    // 1. Verificar registros actuales
    console.log('📋 Estado actual:\n');
    
    const enParticipante = await prisma.visionParticipante.count({
      where: { participanteId: userId, visionId }
    });
    console.log(`En VisionParticipante: ${enParticipante}`);

    const enGameChanger = await prisma.visionGameChanger.count({
      where: { gameChangerId: userId, visionId }
    });
    console.log(`En VisionGameChanger: ${enGameChanger}\n`);

    // 2. Crear en VisionGameChanger si no existe
    if (enGameChanger === 0) {
      console.log('➕ Creando registro en VisionGameChanger...');
      
      await prisma.visionGameChanger.create({
        data: {
          visionId,
          gameChangerId: userId,
          asignadoPorId: 15, // coordinador@quanter.com
          createdAt: new Date('2025-12-29T02:15:55.328Z') // Fecha original de creación del usuario
        }
      });
      
      console.log('✅ Registro creado en VisionGameChanger');
    } else {
      console.log('✅ Ya existe en VisionGameChanger');
    }

    // 3. Verificar estado final
    console.log('\n📊 Estado final:\n');
    
    const finalParticipante = await prisma.visionParticipante.count({
      where: { participanteId: userId, visionId }
    });
    console.log(`En VisionParticipante: ${finalParticipante}`);

    const finalGameChanger = await prisma.visionGameChanger.count({
      where: { gameChangerId: userId, visionId }
    });
    console.log(`En VisionGameChanger: ${finalGameChanger}`);

    console.log('\n✅ Reparación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGame3AsGameChanger();
