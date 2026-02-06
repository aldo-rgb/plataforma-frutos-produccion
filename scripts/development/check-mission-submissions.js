// Script para verificar las submissions de la misión "prueba preguntas"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissionSubmissions() {
  try {
    // Encontrar la misión "prueba preguntas"
    const mission = await prisma.trainerMission.findFirst({
      where: { 
        Template: { title: 'prueba preguntas' },
        status: 'ACTIVE'
      },
      select: { 
        id: true, 
        visionId: true, 
        productId: true,
        Template: { select: { title: true } }
      }
    });

    if (!mission) {
      console.log('❌ Misión no encontrada');
      return;
    }

    console.log(`\n📋 Misión: ${mission.Template?.title}`);
    console.log(`   visionId: ${mission.visionId}, productId: ${mission.productId}`);

    // Ver todas las submissions de esta misión
    const submissions = await prisma.missionSubmission.findMany({
      where: { missionId: mission.id },
      select: { 
        id: true,
        userId: true,
        status: true
      }
    });

    console.log(`\n📊 Total submissions: ${submissions.length}`);
    
    // Ver detalle de cada usuario
    console.log('\n👥 Usuarios con submissions:');
    for (const sub of submissions) {
      const user = await prisma.usuario.findUnique({
        where: { id: sub.userId },
        select: { nombre: true, rol: true, isActive: true }
      });
      
      // Verificar si el usuario está en un squad activo de AVANZADO
      const membership = await prisma.smallGroupMember.findFirst({
        where: { 
          userId: sub.userId,
          isActive: true,
          group: { 
            visionId: 2, 
            level: 'ADVANCED',
            isActive: true 
          }
        },
        include: { group: { select: { name: true, level: true } } }
      });

      const squadInfo = membership ? `✅ ${membership.group.name}` : '❌ Sin squad ADVANCED';
      console.log(`  - ${user?.nombre} (ID: ${sub.userId}) - ${user?.rol} - ${squadInfo}`);
    }

    // Verificar cuántos REALMENTE deberían tener submission
    // Solo los que están en squads ADVANCED activos
    const advancedMembers = await prisma.smallGroupMember.findMany({
      where: {
        isActive: true,
        group: {
          visionId: 2,
          level: 'ADVANCED',
          isActive: true
        }
      },
      select: { userId: true }
    });

    const uniqueAdvancedUsers = [...new Set(advancedMembers.map(m => m.userId))];
    console.log(`\n✅ Usuarios en squads ADVANCED activos: ${uniqueAdvancedUsers.length}`);

    // Verificar quién está de más
    const submissionUserIds = submissions.map(s => s.userId);
    const extraUsers = submissionUserIds.filter(id => !uniqueAdvancedUsers.includes(id));
    
    if (extraUsers.length > 0) {
      console.log(`\n⚠️ Usuarios CON submission pero SIN squad ADVANCED: ${extraUsers.length}`);
      for (const userId of extraUsers) {
        const user = await prisma.usuario.findUnique({
          where: { id: userId },
          select: { nombre: true }
        });
        console.log(`  - ${user?.nombre} (ID: ${userId})`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissionSubmissions();
