const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkV4CallsCorrect() {
  try {
    console.log('\n🔍 VERIFICANDO LLAMADAS Y ENROLLMENT DE v4@next.com\n');
    
    // 1. Buscar usuario
    const user = await prisma.usuario.findUnique({
      where: { email: 'v4@next.com' },
      select: { id: true, nombre: true }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log(`👤 Usuario: ${user.nombre} (ID: ${user.id})\n`);
    
    // 2. Buscar TODAS las llamadas (no solo DISCIPLINE)
    const allCalls = await prisma.callBooking.findMany({
      where: {
        studentId: user.id
      },
      include: {
        Usuario_CallBooking_mentorIdToUsuario: {
          select: { nombre: true, email: true }
        },
        ProgramEnrollment: true
      },
      orderBy: { scheduledAt: 'desc' },
      take: 10
    });
    
    console.log(`📞 TODAS LAS LLAMADAS: ${allCalls.length}\n`);
    
    allCalls.forEach((call, idx) => {
      console.log(`${idx + 1}. ID: ${call.id}`);
      console.log(`   Tipo: ${call.type}`);
      console.log(`   Fecha: ${call.scheduledAt.toISOString()}`);
      console.log(`   Mentor: ${call.Usuario_CallBooking_mentorIdToUsuario.nombre}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Asistencia: ${call.attendanceStatus || 'N/A'}`);
      console.log(`   ProgramEnrollmentId: ${call.programEnrollmentId || '❌ NULL'}`);
      console.log(`   Tiene ProgramEnrollment: ${call.ProgramEnrollment ? '✅ SÍ' : '❌ NO'}`);
      console.log('');
    });
    
    // 3. Buscar enrollment del usuario
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        userId: user.id
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: { nombre: true, email: true }
        }
      }
    });
    
    console.log(`📋 ENROLLMENTS: ${enrollments.length}\n`);
    
    enrollments.forEach((e, idx) => {
      console.log(`${idx + 1}. ID: ${e.id}`);
      console.log(`   Mentor: ${e.Usuario_ProgramEnrollment_mentorIdToUsuario.nombre}`);
      console.log(`   Ciclo: ${e.cycleType}`);
      console.log(`   Inicio: ${e.startDate.toISOString().split('T')[0]}`);
      console.log(`   Fin: ${e.endDate.toISOString().split('T')[0]}`);
      console.log(`   Faltas: ${e.missedCallsCount}/${e.maxMissedAllowed}`);
      console.log('');
    });
    
    // 4. Si hay llamadas sin enrollment, mostrar cuál enrollment deberían tener
    const callsSinEnrollment = allCalls.filter(c => !c.programEnrollmentId);
    if (callsSinEnrollment.length > 0 && enrollments.length > 0) {
      console.log(`⚠️ PROBLEMA: ${callsSinEnrollment.length} llamadas sin programEnrollmentId`);
      console.log(`💡 Deberían estar vinculadas al enrollment: ${enrollments[0].id}`);
      console.log(`\n🔧 Para arreglar, ejecuta:`);
      console.log(`   UPDATE "CallBooking" SET "programEnrollmentId" = ${enrollments[0].id} WHERE "studentId" = ${user.id} AND "programEnrollmentId" IS NULL;`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkV4CallsCorrect();
