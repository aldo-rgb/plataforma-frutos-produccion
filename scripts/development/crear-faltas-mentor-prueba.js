const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearFaltasMentor() {
  const userId = 59; // Jorge Campos
  
  console.log('🔧 Creando reportes de ausencia de mentor para prueba...');
  console.log('='.repeat(60));
  
  try {
    // Obtener paquete activo
    const packageCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: userId,
          status: 'COMPLETED'
        },
        remainingSessions: { gt: 0 },
        isActive: true
      },
      include: {
        MentorPackageOrder: {
          select: {
            id: true,
            mentorId: true,
            createdAt: true,
            Mentor: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!packageCredits) {
      console.log('❌ No hay paquete activo para este usuario');
      return;
    }

    console.log(`✅ Paquete encontrado - Mentor: ${packageCredits.MentorPackageOrder.Mentor.nombre}`);

    const mentorId = packageCredits.MentorPackageOrder.mentorId;

    // Verificar reportes existentes
    const existingReports = await prisma.mentorAbsenceReport.count({
      where: {
        studentId: userId,
        mentorId: mentorId,
        status: {
          in: ['CONFIRMED', 'PENDING']
        },
        reportedAt: {
          gte: packageCredits.MentorPackageOrder.createdAt
        }
      }
    });

    console.log(`📊 Reportes existentes en este ciclo: ${existingReports}`);

    const reportesACrear = Math.max(0, 2 - existingReports);
    
    if (reportesACrear === 0) {
      console.log('✅ Ya tiene 2 o más reportes. No se crearán más.');
      return;
    }

    console.log(`\n📝 Creando ${reportesACrear} reporte(s) de ausencia...`);

    for (let i = 0; i < reportesACrear; i++) {
      const scheduledTime = new Date();
      scheduledTime.setDate(scheduledTime.getDate() - (i + 1) * 3); // Hace 3, 6 días, etc.
      scheduledTime.setHours(10, 0, 0, 0);

      const report = await prisma.mentorAbsenceReport.create({
        data: {
          studentId: userId,
          mentorId: mentorId,
          scheduledTime: scheduledTime,
          status: 'CONFIRMED',
          reason: `El mentor no se presentó a la sesión programada (reporte de prueba ${i + 1})`,
          reportedAt: new Date(scheduledTime.getTime() + 30 * 60 * 1000) // 30 min después
        }
      });

      console.log(`   ✅ Reporte ${i + 1} creado:`);
      console.log(`      - Fecha programada: ${scheduledTime.toLocaleString('es-MX')}`);
      console.log(`      - Status: CONFIRMED`);
    }

    // Verificar total de reportes
    const totalReports = await prisma.mentorAbsenceReport.count({
      where: {
        studentId: userId,
        mentorId: mentorId,
        status: {
          in: ['CONFIRMED', 'PENDING']
        },
        reportedAt: {
          gte: packageCredits.MentorPackageOrder.createdAt
        }
      }
    });

    console.log(`\n✅ Total de reportes confirmados: ${totalReports}`);
    console.log(`${totalReports >= 2 ? '✅' : '❌'} El usuario ${totalReports >= 2 ? 'PUEDE' : 'NO PUEDE'} solicitar cambio de mentor`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Proceso completado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

crearFaltasMentor();
