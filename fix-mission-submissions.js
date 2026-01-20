// Script para corregir las submissions de misiones
// Elimina submissions de usuarios que NO tienen check-in en la visión
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissionSubmissions() {
  try {
    const visionId = 2; // v1 gdl

    // 1. Obtener usuarios CON check-in en productos de esta visión
    const checkIns = await prisma.checkInRecord.findMany({
      where: { 
        Product: { visionId }
      },
      select: { userId: true },
      distinct: ['userId']
    });
    
    const usersWithCheckIn = checkIns.map(c => c.userId);
    console.log(`\n✅ Usuarios con check-in en v1 gdl: ${usersWithCheckIn.length}`);
    
    // Ver quiénes son
    for (const userId of usersWithCheckIn) {
      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { nombre: true }
      });
      console.log(`  - ${user?.nombre} (ID: ${userId})`);
    }

    // 2. Obtener misiones activas de esta visión
    const missions = await prisma.trainerMission.findMany({
      where: { visionId, status: 'ACTIVE' },
      select: { 
        id: true,
        Template: { select: { title: true } },
        _count: { select: { Submissions: true } }
      }
    });

    console.log(`\n📋 Misiones activas: ${missions.length}`);

    // 3. Para cada misión, eliminar submissions de usuarios sin check-in
    for (const mission of missions) {
      const submissions = await prisma.missionSubmission.findMany({
        where: { missionId: mission.id },
        select: { id: true, userId: true }
      });

      const toDelete = submissions.filter(s => !usersWithCheckIn.includes(s.userId));
      
      if (toDelete.length > 0) {
        console.log(`\n🗑️ Misión "${mission.Template?.title}": eliminando ${toDelete.length} submissions de usuarios sin check-in`);
        
        for (const sub of toDelete) {
          const user = await prisma.usuario.findUnique({
            where: { id: sub.userId },
            select: { nombre: true }
          });
          console.log(`  - ${user?.nombre} (ID: ${sub.userId})`);
        }

        // Eliminar
        await prisma.missionSubmission.deleteMany({
          where: {
            id: { in: toDelete.map(s => s.id) }
          }
        });
        
        console.log(`  ✅ Eliminadas ${toDelete.length} submissions`);
      } else {
        console.log(`\n✅ Misión "${mission.Template?.title}": todas las submissions son válidas`);
      }
    }

    // 4. Verificar resultado final
    console.log('\n--- RESULTADO FINAL ---');
    for (const mission of missions) {
      const count = await prisma.missionSubmission.count({
        where: { missionId: mission.id }
      });
      console.log(`📊 ${mission.Template?.title}: ${count} submissions`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissionSubmissions();
