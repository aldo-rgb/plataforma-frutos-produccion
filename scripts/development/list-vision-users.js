const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listVisionUsers() {
  try {
    // Buscar participantes de la visión 1
    const participants = await prisma.visionParticipante.findMany({
      where: { visionId: 1 },
      include: {
        Participante: {
          include: {
            ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    console.log('\n👥 Participantes de Visión ID 1:\n');
    
    for (const p of participants) {
      const user = p.Participante;
      const enrollment = user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
      
      console.log(`📋 ${user.nombre} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      
      if (enrollment) {
        const start = new Date(enrollment.cycleStartDate);
        const end = new Date(enrollment.cycleEndDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const correctWeeks = Math.ceil(diffDays / 7);
        
        console.log(`   Enrollment ID: ${enrollment.id}`);
        console.log(`   Semanas DB: ${enrollment.totalWeeks}`);
        console.log(`   Semanas Real: ${correctWeeks}`);
        console.log(`   Fechas: ${start.toISOString().split('T')[0]} a ${end.toISOString().split('T')[0]}`);
        console.log(`   ${enrollment.totalWeeks !== correctWeeks ? '❌ DISCREPANCIA' : '✅ OK'}`);
      } else {
        console.log(`   ⚠️ Sin enrollment activo`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listVisionUsers();
