const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkV4Enrollment() {
  try {
    const userId = 37; // v4@next.com
    
    console.log('\n🔍 VERIFICANDO ENROLLMENT Y LLAMADAS DE v4@next.com\n');
    
    // 1. Verificar enrollment
    const enrollment = await prisma.programEnrollment.findFirst({
      where: { userId: userId },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: { nombre: true, email: true }
        }
      }
    });
    
    if (enrollment) {
      console.log('✅ ProgramEnrollment encontrado:');
      console.log(`   ID: ${enrollment.id}`);
      console.log(`   Mentor: ${enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.nombre} (${enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.email})`);
      console.log(`   Ciclo: ${enrollment.cycleType}`);
      console.log(`   Faltas: ${enrollment.missedCallsCount}/${enrollment.maxMissedAllowed}`);
      console.log(`   Status: ${enrollment.status || 'N/A'}`);
    } else {
      console.log('❌ No se encontró ProgramEnrollment');
    }
    
    // 2. Verificar llamadas de disciplina
    const calls = await prisma.callBooking.findMany({
      where: {
        studentId: userId,
        type: 'DISCIPLINE'
      },
      orderBy: { scheduledAt: 'desc' },
      take: 5
    });
    
    console.log(`\n📞 Llamadas de disciplina: ${calls.length}\n`);
    calls.forEach((c, idx) => {
      console.log(`${idx + 1}. ID: ${c.id}`);
      console.log(`   Fecha: ${c.scheduledAt.toISOString().split('T')[0]}`);
      console.log(`   Status: ${c.status}`);
      console.log(`   Asistencia: ${c.attendanceStatus || 'N/A'}`);
      console.log(`   ProgramEnrollmentId: ${c.programEnrollmentId || '❌ NULL'}`);
      console.log('');
    });
    
    if (enrollment && calls.length > 0) {
      const callsSinEnrollment = calls.filter(c => !c.programEnrollmentId);
      if (callsSinEnrollment.length > 0) {
        console.log(`⚠️ PROBLEMA: ${callsSinEnrollment.length} llamadas sin programEnrollmentId`);
        console.log(`💡 SOLUCIÓN: Actualizar llamadas para vincularlas al enrollment ${enrollment.id}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkV4Enrollment();
