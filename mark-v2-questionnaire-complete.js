const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function markV2QuestionnaireComplete() {
  console.log('🔍 Buscando usuarios de V2 GDL...\n');
  
  // V2 GDL tiene visionId = 3
  const visionId = 3;
  
  // Obtener todos los enrollments de V2 GDL (ADVANCED)
  const enrollments = await prisma.vision_enrollments.findMany({
    where: {
      visionId: visionId,
      level: 'ADVANCED'
    },
    include: {
      Usuario_vision_enrollments_userIdToUsuario: {
        select: {
          id: true,
          nombre: true,
          email: true
        }
      }
    }
  });
  
  console.log(`📊 Encontrados ${enrollments.length} usuarios ADVANCED en V2 GDL\n`);
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const enrollment of enrollments) {
    const user = enrollment.Usuario_vision_enrollments_userIdToUsuario;
    if (!user) {
      console.log(`⚠️  Enrollment ${enrollment.id} sin usuario, saltando...`);
      skipped++;
      continue;
    }
    
    const userId = enrollment.userId;
    const userName = user.nombre;
    
    // Verificar si ya tiene cuestionario
    const existingQuestionnaire = await prisma.advancedQuestionnaire.findUnique({
      where: { userId: userId }
    });
    
    if (existingQuestionnaire) {
      if (existingQuestionnaire.status === 'COMPLETED') {
        console.log(`✅ ${userName} - ya tiene cuestionario COMPLETED`);
        skipped++;
      } else {
        // Actualizar a COMPLETED
        await prisma.advancedQuestionnaire.update({
          where: { userId: userId },
          data: {
            status: 'COMPLETED',
            currentDimension: 5,
            completedAt: new Date()
          }
        });
        console.log(`🔄 ${userName} - actualizado a COMPLETED`);
        updated++;
      }
    } else {
      // Crear nuevo cuestionario con status COMPLETED
      await prisma.advancedQuestionnaire.create({
        data: {
          userId: userId,
          visionId: visionId,
          status: 'COMPLETED',
          currentDimension: 5,
          completedAt: new Date()
        }
      });
      console.log(`✨ ${userName} - cuestionario creado como COMPLETED`);
      created++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📈 RESUMEN:');
  console.log(`   ✨ Creados: ${created}`);
  console.log(`   🔄 Actualizados: ${updated}`);
  console.log(`   ⏭️  Sin cambios: ${skipped}`);
  console.log(`   📊 Total procesados: ${enrollments.length}`);
  console.log('='.repeat(50));
}

markV2QuestionnaireComplete()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
