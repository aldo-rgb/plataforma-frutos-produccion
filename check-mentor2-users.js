const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Verificando usuarios asignados a Mentor2 (ID: 14)...\n');
  
  // Usuarios con assignedMentorId = 14
  const usuarios = await prisma.usuario.findMany({
    where: {
      assignedMentorId: 14,
      rol: 'PARTICIPANTE',
      isActive: true
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      assignedMentorId: true
    },
    orderBy: { nombre: 'asc' }
  });
  
  console.log('✅ Usuarios con assignedMentorId = 14:');
  usuarios.forEach(u => {
    console.log(`   - ID: ${u.id}, Nombre: "${u.nombre}", Email: ${u.email}`);
  });
  
  console.log(`\nTotal: ${usuarios.length} usuarios\n`);
  
  // Verificar enrollments
  console.log('--- Verificando ProgramEnrollments ---\n');
  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      mentorId: 14,
      status: 'ACTIVE'
    },
    include: {
      Usuario_ProgramEnrollment_userIdToUsuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        }
      }
    }
  });
  
  console.log('✅ Enrollments con mentorId = 14:');
  enrollments.forEach(e => {
    console.log(`   - User ID: ${e.userId}, Nombre: "${e.Usuario_ProgramEnrollment_userIdToUsuario.nombre}", Email: ${e.Usuario_ProgramEnrollment_userIdToUsuario.email}, Rol: ${e.Usuario_ProgramEnrollment_userIdToUsuario.rol}`);
  });
  
  console.log(`\nTotal enrollments: ${enrollments.length}`);
  
  await prisma.$disconnect();
}

check();
