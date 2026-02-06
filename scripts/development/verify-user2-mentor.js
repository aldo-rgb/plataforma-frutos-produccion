/**
 * Verificar datos de User 2 (vision1@frutos.com)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser2() {
  console.log('🔍 Verificando User 2...\n');
  
  const user = await prisma.usuario.findUnique({
    where: { email: 'vision1@frutos.com' },
    select: {
      id: true,
      nombre: true,
      email: true,
      organizationId: true,
      assignedMentorId: true,
      ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          mentorId: true,
          status: true,
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
      }
    }
  });
  
  console.log('📊 Datos del usuario:');
  console.log('  ID:', user.id);
  console.log('  Nombre:', user.nombre);
  console.log('  Email:', user.email);
  console.log('  Organization ID:', user.organizationId);
  console.log('  Assigned Mentor ID:', user.assignedMentorId);
  console.log();
  
  if (user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario.length > 0) {
    const enrollment = user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
    console.log('✅ TIENE ProgramEnrollment ACTIVO:');
    console.log('  Enrollment ID:', enrollment.id);
    console.log('  Mentor ID:', enrollment.mentorId);
    console.log('  Status:', enrollment.status);
    console.log();
    
    if (enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario) {
      const mentor = enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario;
      console.log('👨‍🏫 Mentor asignado en enrollment:');
      console.log('  ID:', mentor.id);
      console.log('  Nombre:', mentor.nombre);
      console.log('  Email:', mentor.email);
      console.log('  Profile Image:', mentor.profileImage || 'null');
      console.log('  Imagen:', mentor.imagen || 'null');
    } else {
      console.log('❌ NO tiene mentor en enrollment');
    }
  } else {
    console.log('❌ NO tiene ProgramEnrollment activo');
  }
  
  await prisma.$disconnect();
}

checkUser2().catch(console.error);
