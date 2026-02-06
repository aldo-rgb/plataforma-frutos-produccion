const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGame3Enrollment() {
  try {
    console.log('🔍 Verificando enrollment de game3@quanter.com...\n');
    
    const enrollments = await prisma.programEnrollment.findMany({
      where: { userId: 31 },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (enrollments.length === 0) {
      console.log('❌ No tiene enrollments');
      return;
    }

    console.log(`📋 Encontrados ${enrollments.length} enrollment(s):\n`);
    
    enrollments.forEach((e, i) => {
      console.log(`━━━ Enrollment ${i + 1} ━━━`);
      console.log('  ID:', e.id);
      console.log('  Status:', e.status);
      console.log('  Mentor ID:', e.mentorId);
      console.log('  Mentor:', e.Usuario_ProgramEnrollment_mentorIdToUsuario?.nombre || 'Sin mentor');
      console.log('  Email mentor:', e.Usuario_ProgramEnrollment_mentorIdToUsuario?.email || 'N/A');
      console.log('  Cycle Type:', e.cycleType);
      console.log('  Start Date:', e.cycleStartDate);
      console.log('  End Date:', e.cycleEndDate);
      console.log('  Creado:', e.createdAt);
      console.log('');
    });

    // Verificar si hay alguno ACTIVE
    const activo = enrollments.find(e => e.status === 'ACTIVE');
    if (activo) {
      console.log('✅ Tiene enrollment ACTIVO');
      console.log('   Mentor:', activo.Usuario_ProgramEnrollment_mentorIdToUsuario?.nombre);
    } else {
      console.log('⚠️ No tiene enrollments ACTIVE, solo:', enrollments.map(e => e.status).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame3Enrollment();
