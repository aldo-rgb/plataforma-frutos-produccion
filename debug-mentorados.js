const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMentorados() {
  try {
    // Primero, busca un mentor
    const mentor = await prisma.usuario.findFirst({
      where: { role: 'MENTOR' }
    });

    if (!mentor) {
      console.log('❌ No hay mentores en la base de datos');
      return;
    }

    console.log('\n🔍 MENTOR:', mentor.id, '-', mentor.nombre);

    // Obtener enrollments del mentor
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        mentorId: mentor.id,
        status: 'ACTIVE'
      },
      include: {
        participant: {
          select: {
            id: true,
            nombre: true,
            avatar: true,
            quantumPoints: true,
            nivel: true,
            visionId: true,
            organizationId: true,
            Organization: {
              select: {
                name: true,
                logoUrl: true
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

    console.log(`\n📊 Total enrollments ACTIVE: ${enrollments.length}\n`);

    enrollments.forEach((enrollment, index) => {
      const p = enrollment.participant;
      console.log(`\n--- MENTORADO ${index + 1} ---`);
      console.log('ID:', p.id);
      console.log('Nombre:', p.nombre);
      console.log('organizationId:', p.organizationId);
      console.log('Organization.name:', p.Organization?.name || 'NULL');
      console.log('visionId (campo directo):', p.visionId);
      console.log('ParticipanteEnVisiones:', p.ParticipanteEnVisiones.length, 'registros');
      
      if (p.ParticipanteEnVisiones.length > 0) {
        p.ParticipanteEnVisiones.forEach((pv, i) => {
          console.log(`  [${i}] Vision:`, pv.Vision?.nombre, '- Active:', pv.Vision?.isActive);
        });
      }

      const visionActiva = p.ParticipanteEnVisiones.find(pv => pv.Vision?.isActive)?.Vision;
      console.log('✅ Vision detectada:', visionActiva?.nombre || 'NULL');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMentorados();
