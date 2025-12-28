const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentorFrutos() {
  try {
    console.log('\n🔍 Buscando usuario Mentor@frutos.com...\n');
    
    const mentor = await prisma.usuario.findUnique({
      where: { email: 'Mentor@frutos.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        organizationId: true,
        Organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!mentor) {
      console.log('❌ No se encontró el usuario Mentor@frutos.com');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('   ID:', mentor.id);
    console.log('   Nombre:', mentor.nombre);
    console.log('   Rol:', mentor.rol);
    console.log('   OrganizationId:', mentor.organizationId);
    console.log('   Organization:', mentor.Organization?.name || 'NULL');

    // Buscar enrollments donde este usuario es mentor
    console.log('\n📋 Buscando enrollments como MENTOR...\n');
    
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        mentorId: mentor.id
      },
      include: {
        participant: {
          select: {
            id: true,
            nombre: true,
            email: true,
            organizationId: true,
            Organization: {
              select: {
                name: true
              }
            },
            ParticipanteEnVisiones: {
              include: {
                Vision: {
                  select: {
                    id: true,
                    nombre: true,
                    isActive: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`Total enrollments: ${enrollments.length}\n`);

    enrollments.forEach((enrollment, index) => {
      console.log(`--- ENROLLMENT ${index + 1} ---`);
      console.log('Enrollment ID:', enrollment.id);
      console.log('Status:', enrollment.status);
      console.log('Participante:', enrollment.participant.nombre);
      console.log('Participante Email:', enrollment.participant.email);
      console.log('Participante Org:', enrollment.participant.Organization?.name || 'NULL');
      console.log('ParticipanteEnVisiones:', enrollment.participant.ParticipanteEnVisiones.length);
      
      if (enrollment.participant.ParticipanteEnVisiones.length > 0) {
        enrollment.participant.ParticipanteEnVisiones.forEach((pv, i) => {
          console.log(`  [${i}] Vision: ${pv.Vision?.nombre} - Active: ${pv.Vision?.isActive}`);
        });
      }
      
      console.log('');
    });

    // Filtrar solo ACTIVE
    const activeEnrollments = enrollments.filter(e => e.status === 'ACTIVE');
    console.log(`\n✅ Enrollments ACTIVE: ${activeEnrollments.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentorFrutos();
