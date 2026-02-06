const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentorEnrollments() {
  try {
    // Buscar el mentor (asumiendo que es el usuario actual)
    const mentor = await prisma.usuario.findFirst({
      where: {
        rol: 'MENTOR'
      },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    if (!mentor) {
      console.log('❌ No se encontró ningún mentor en la base de datos');
      return;
    }

    console.log('\n✅ Mentor encontrado:');
    console.log(`   ID: ${mentor.id}`);
    console.log(`   Nombre: ${mentor.nombre}`);
    console.log(`   Email: ${mentor.email}`);

    // Buscar TODOS los enrollments de este mentor
    const allEnrollments = await prisma.programEnrollment.findMany({
      where: {
        mentorId: mentor.id
      },
      include: {
        Usuario_ProgramEnrollment_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            puntosCuanticos: true,
            nivelActual: true
          }
        }
      }
    });

    console.log(`\n📊 Total de enrollments encontrados: ${allEnrollments.length}`);
    
    if (allEnrollments.length === 0) {
      console.log('❌ No hay enrollments asignados a este mentor');
      return;
    }

    console.log('\n📋 Detalles de cada enrollment:');
    allEnrollments.forEach((enrollment, index) => {
      const student = enrollment.Usuario_ProgramEnrollment_userIdToUsuario;
      console.log(`\n   ${index + 1}. Enrollment ID: ${enrollment.id}`);
      console.log(`      Status: ${enrollment.status}`);
      console.log(`      Estudiante: ${student.nombre} (ID: ${student.id})`);
      console.log(`      Email: ${student.email}`);
      console.log(`      Puntos: ${student.puntosCuanticos || 0} PC`);
      console.log(`      Nivel: ${student.nivelActual || 1}`);
      console.log(`      Cycle Type: ${enrollment.cycleType}`);
      console.log(`      Start Date: ${enrollment.startDate}`);
      console.log(`      End Date: ${enrollment.endDate}`);
    });

    // Contar por status
    const statusCount = {};
    allEnrollments.forEach(e => {
      statusCount[e.status] = (statusCount[e.status] || 0) + 1;
    });

    console.log('\n📈 Enrollments por status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentorEnrollments();
