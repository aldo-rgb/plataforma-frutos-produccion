const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCambioMentor() {
  const userId = 59; // Jorge Campos
  
  console.log('🔍 Probando sistema de cambio de mentor para usuario:', userId);
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar paquete activo
    console.log('\n1️⃣ Verificando paquete activo...');
    const packageCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: userId,
          status: 'COMPLETED'
        },
        remainingSessions: { gt: 0 },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
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
      console.log('❌ No tiene paquete activo');
      return;
    }

    console.log('✅ Paquete activo encontrado:');
    console.log('   - Mentor:', packageCredits.MentorPackageOrder.Mentor.nombre);
    console.log('   - Sesiones restantes:', packageCredits.remainingSessions);
    console.log('   - Fecha creación:', packageCredits.MentorPackageOrder.createdAt);

    // 2. Verificar reportes de ausencia
    console.log('\n2️⃣ Verificando reportes de ausencia del mentor...');
    const mentorAbsences = await prisma.mentorAbsenceReport.findMany({
      where: {
        studentId: userId,
        mentorId: packageCredits.MentorPackageOrder.mentorId,
        status: {
          in: ['CONFIRMED', 'PENDING']
        },
        reportedAt: {
          gte: packageCredits.MentorPackageOrder.createdAt
        }
      },
      orderBy: {
        reportedAt: 'desc'
      }
    });

    console.log(`📊 Reportes de ausencia: ${mentorAbsences.length}`);
    
    if (mentorAbsences.length > 0) {
      console.log('\n   Detalle de reportes:');
      mentorAbsences.forEach((report, index) => {
        console.log(`   ${index + 1}. Fecha: ${report.scheduledTime.toLocaleDateString()}`);
        console.log(`      Status: ${report.status}`);
        console.log(`      Razón: ${report.reason || 'No especificada'}`);
      });
    }

    const puedesCambiarMentor = mentorAbsences.length >= 2;
    console.log(`\n${puedesCambiarMentor ? '✅' : '❌'} Puede cambiar mentor: ${puedesCambiarMentor ? 'SÍ' : 'NO'}`);
    console.log(`   (Requiere 2 faltas, tiene ${mentorAbsences.length})`);

    // 3. Contar sesiones pendientes
    console.log('\n3️⃣ Verificando sesiones pendientes...');
    const pendingSessions = await prisma.callBooking.findMany({
      where: {
        studentId: userId,
        mentorId: packageCredits.MentorPackageOrder.mentorId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        },
        scheduledAt: {
          gte: new Date()
        },
        programEnrollmentId: null
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    console.log(`📅 Sesiones pendientes: ${pendingSessions.length}`);
    if (pendingSessions.length > 0) {
      console.log('\n   Próximas sesiones:');
      pendingSessions.slice(0, 3).forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.scheduledAt.toLocaleString('es-MX')}`);
      });
      if (pendingSessions.length > 3) {
        console.log(`   ... y ${pendingSessions.length - 3} más`);
      }
    }

    // 4. Simular cambio de mentor (sin ejecutar)
    if (puedesCambiarMentor) {
      console.log('\n4️⃣ SIMULACIÓN: Cambio de mentor');
      console.log('   Si el usuario solicita cambio, se realizarían estas acciones:');
      console.log(`   - Cancelar ${pendingSessions.length} sesiones pendientes`);
      console.log('   - Limpiar assignedMentorId del usuario');
      console.log('   - Permitir seleccionar nuevo mentor');
      console.log('   - Reagendar sesiones con nuevo mentor');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Prueba completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCambioMentor();
