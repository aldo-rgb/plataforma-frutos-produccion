/**
 * Verificar enrollment con detalles completos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnrollment() {
  console.log('🔍 Verificando Enrollment de User 2...\n');
  
  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      userId: 6, // User 2
      status: 'ACTIVE'
    },
    include: {
      Usuario_ProgramEnrollment_mentorIdToUsuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
          profileImage: true,
          imagen: true
        }
      }
    }
  });
  
  if (!enrollment) {
    console.log('❌ NO se encontró enrollment activo');
    return;
  }
  
  console.log('✅ Enrollment encontrado:');
  console.log('  ID:', enrollment.id);
  console.log('  User ID:', enrollment.userId);
  console.log('  Mentor ID:', enrollment.mentorId);
  console.log('  Status:', enrollment.status);
  console.log();
  
  if (enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario) {
    console.log('👨‍🏫 Mentor en relación:');
    console.log('  ID:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.id);
    console.log('  Nombre:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.nombre);
    console.log('  Email:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.email);
    console.log('  Profile Image:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.profileImage);
    console.log('  Imagen:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.imagen);
  } else {
    console.log('❌ El enrollment NO tiene mentor en la relación');
    console.log('   Esto significa que mentorId es NULL en la base de datos');
  }
  
  await prisma.$disconnect();
}

checkEnrollment().catch(console.error);
