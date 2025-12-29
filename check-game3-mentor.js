const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGame3Mentor() {
  try {
    console.log('🔍 Verificando mentor de game3@quanter.com...\n');
    
    const user = await prisma.usuario.findUnique({
      where: { email: 'game3@quanter.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        assignedMentorId: true,
        mentorId: true
      }
    });

    console.log('👤 Usuario:');
    console.log('   ID:', user.id);
    console.log('   Nombre:', user.nombre);
    console.log('   Rol:', user.rol);
    console.log('   assignedMentorId:', user.assignedMentorId);
    console.log('   mentorId (legacy):', user.mentorId);
    console.log('');

    if (user.assignedMentorId) {
      const mentor = await prisma.usuario.findUnique({
        where: { id: user.assignedMentorId },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        }
      });

      console.log('👨‍🏫 Mentor asignado:');
      console.log('   ID:', mentor.id);
      console.log('   Nombre:', mentor.nombre);
      console.log('   Email:', mentor.email);
      console.log('   Rol:', mentor.rol);
    } else {
      console.log('❌ No tiene mentor asignado en assignedMentorId');
    }

    // Verificar en ProgramEnrollment
    console.log('\n📋 Verificando en ProgramEnrollment:');
    const enrollments = await prisma.programEnrollment.findMany({
      where: { userId: user.id },
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (enrollments.length > 0) {
      console.log(`   Encontrados ${enrollments.length} enrollment(s):`);
      enrollments.forEach((e, i) => {
        console.log(`\n   Enrollment ${i + 1}:`);
        console.log('     Status:', e.status);
        console.log('     Mentor ID:', e.mentorId);
        console.log('     Mentor:', e.Mentor?.nombre || 'Sin mentor');
        console.log('     Email:', e.Mentor?.email || 'N/A');
      });
    } else {
      console.log('   No tiene enrollments');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame3Mentor();
