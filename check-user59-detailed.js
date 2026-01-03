const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser59() {
  try {
    console.log('🔍 Verificando usuario 59...\n');
    
    // 1. Buscar usuario
    const user = await prisma.usuario.findUnique({
      where: { id: 59 }
    });
    
    if (!user) {
      console.log('❌ Usuario 59 no existe');
      await prisma.$disconnect();
      return;
    }
    
    console.log('👤 Usuario encontrado:');
    console.log('   ID:', user.id);
    console.log('   Nombre:', user.nombre);
    console.log('   Email:', user.email);
    console.log('   Rol:', user.rol);
    console.log('   Organization ID:', user.organizationId);
    console.log('   Subscription Status:', user.subscriptionStatus);
    
    // 2. Buscar disciplineSubscription
    console.log('\n🎯 Verificando DisciplineSubscription...');
    const disciplineSubscription = await prisma.disciplineSubscription.findUnique({
      where: { studentId: 59 },
      include: {
        Usuario_DisciplineSubscription_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });
    
    if (disciplineSubscription) {
      console.log('✅ DisciplineSubscription encontrada:');
      console.log('   Status:', disciplineSubscription.status);
      console.log('   Start Date:', disciplineSubscription.startDate);
      console.log('   End Date:', disciplineSubscription.endDate);
      console.log('   Day1:', disciplineSubscription.day1);
      console.log('   Time1:', disciplineSubscription.time1);
      console.log('   Day2:', disciplineSubscription.day2);
      console.log('   Time2:', disciplineSubscription.time2);
      console.log('   Missed Calls:', disciplineSubscription.missedCallsCount);
      console.log('   Mentor:', disciplineSubscription.Usuario_DisciplineSubscription_mentorIdToUsuario?.nombre || 'N/A');
    } else {
      console.log('❌ No tiene DisciplineSubscription');
    }
    
    // 3. Buscar programEnrollments
    console.log('\n📚 Verificando ProgramEnrollments...');
    const allEnrollments = await prisma.programEnrollment.findMany({
      where: {
        userId: 59,
        status: 'ACTIVE'
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            CallBooking: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`   Total enrollments activos: ${allEnrollments.length}`);
    
    if (allEnrollments.length > 0) {
      allEnrollments.forEach((enrollment, idx) => {
        console.log(`\n   Enrollment #${idx + 1}:`);
        console.log('      ID:', enrollment.id);
        console.log('      Status:', enrollment.status);
        console.log('      Cycle Type:', enrollment.cycleType);
        console.log('      Start Date:', enrollment.cycleStartDate);
        console.log('      End Date:', enrollment.cycleEndDate);
        console.log('      Mentor ID:', enrollment.mentorId);
        console.log('      Mentor:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario?.nombre || 'N/A');
        console.log('      Call Bookings:', enrollment._count.CallBooking);
        console.log('      Created At:', enrollment.createdAt);
      });
      
      // Aplicar la misma lógica que en dashboard/page.tsx
      const selectedEnrollment = allEnrollments.find(e => e._count.CallBooking > 0) || 
                                 allEnrollments.find(e => e.mentorId !== 59 && e.cycleType !== 'SOLO') ||
                                 allEnrollments[0];
      
      console.log('\n🎯 Enrollment seleccionado (según lógica):');
      console.log('   ID:', selectedEnrollment.id);
      console.log('   Cycle Type:', selectedEnrollment.cycleType);
      console.log('   Call Bookings:', selectedEnrollment._count.CallBooking);
    } else {
      console.log('   ❌ No tiene enrollments activos');
    }
    
    // 4. Buscar licencia
    console.log('\n🎫 Verificando licencia...');
    const license = await prisma.licenseAssignment.findFirst({
      where: {
        userId: 59,
        isActive: true
      }
    });
    
    if (license) {
      console.log('✅ Licencia activa encontrada:');
      console.log('   License Code:', license.licenseCode);
      console.log('   Is Active:', license.isActive);
      console.log('   Activated At:', license.activatedAt);
      console.log('   Expires At:', license.expiresAt);
    } else {
      console.log('❌ No tiene licencia activa');
    }
    
    // 5. Buscar VisionParticipante
    console.log('\n🔮 Verificando VisionParticipante...');
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: {
        participanteId: 59
      },
      include: {
        Vision: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (visionParticipante) {
      console.log('✅ VisionParticipante encontrado:');
      console.log('   Vision:', visionParticipante.Vision?.nombre);
      console.log('   Start Date:', visionParticipante.Vision?.startDate);
      console.log('   End Date:', visionParticipante.Vision?.endDate);
    } else {
      console.log('❌ No está inscrito en ninguna visión');
    }
    
    console.log('\n✅ Verificación completa');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser59();
