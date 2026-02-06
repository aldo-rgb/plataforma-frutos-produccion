const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser59AllData() {
  try {
    console.log('🔍 Verificando TODO el historial del usuario 59...\n');
    
    const user = await prisma.usuario.findUnique({
      where: { id: 59 }
    });
    
    console.log('👤 Usuario:', user.nombre, '(', user.email, ')');
    console.log('   Subscription Status:', user.subscriptionStatus);
    console.log('   Organization ID:', user.organizationId);
    
    // Buscar TODOS los enrollments (activos e inactivos)
    console.log('\n📚 TODOS los ProgramEnrollments (activos e inactivos):');
    const allEnrollments = await prisma.programEnrollment.findMany({
      where: {
        userId: 59
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (allEnrollments.length > 0) {
      allEnrollments.forEach((e, idx) => {
        console.log(`\n   Enrollment #${idx + 1}:`);
        console.log('      ID:', e.id);
        console.log('      Status:', e.status);
        console.log('      Cycle Type:', e.cycleType);
        console.log('      Start Date:', e.cycleStartDate);
        console.log('      End Date:', e.cycleEndDate);
        console.log('      Mentor ID:', e.mentorId);
        console.log('      Mentor:', e.Usuario_ProgramEnrollment_mentorIdToUsuario?.nombre || 'N/A');
        console.log('      Created At:', e.createdAt);
        console.log('      Updated At:', e.updatedAt);
      });
    } else {
      console.log('   ❌ No hay enrollments en la base de datos');
    }
    
    // Buscar TODAS las licencias
    console.log('\n🎫 TODAS las licencias (activas e inactivas):');
    const allLicenses = await prisma.licenseAssignment.findMany({
      where: {
        userId: 59
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });
    
    if (allLicenses.length > 0) {
      allLicenses.forEach((l, idx) => {
        console.log(`\n   Licencia #${idx + 1}:`);
        console.log('      ID:', l.id);
        console.log('      License Code:', l.licenseCode);
        console.log('      Is Active:', l.isActive);
        console.log('      Organization ID:', l.organizationId);
        console.log('      Vision ID:', l.visionId);
        console.log('      Assigned At:', l.assignedAt);
        console.log('      Activated At:', l.activatedAt);
        console.log('      Expires At:', l.expiresAt);
      });
    } else {
      console.log('   ❌ No hay licencias en la base de datos');
    }
    
    // Buscar CallBookings
    console.log('\n📞 CallBookings:');
    const callBookings = await prisma.callBooking.findMany({
      where: {
        programEnrollment: {
          userId: 59
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });
    
    console.log(`   Total: ${callBookings.length}`);
    if (callBookings.length > 0) {
      callBookings.slice(0, 5).forEach((cb, idx) => {
        console.log(`   #${idx + 1}:`, {
          id: cb.id,
          scheduledAt: cb.scheduledAt,
          status: cb.status
        });
      });
      if (callBookings.length > 5) {
        console.log(`   ... y ${callBookings.length - 5} más`);
      }
    }
    
    // Buscar VisionParticipante (todas)
    console.log('\n🔮 TODAS las VisionParticipante:');
    const visionParticipantes = await prisma.visionParticipante.findMany({
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
    
    if (visionParticipantes.length > 0) {
      visionParticipantes.forEach((vp, idx) => {
        console.log(`\n   VisionParticipante #${idx + 1}:`);
        console.log('      Vision:', vp.Vision?.nombre);
        console.log('      Vision Start:', vp.Vision?.startDate);
        console.log('      Vision End:', vp.Vision?.endDate);
        console.log('      Created At:', vp.createdAt);
      });
    } else {
      console.log('   ❌ No hay registros de VisionParticipante');
    }
    
    // Buscar DisciplineSubscription (todas)
    console.log('\n🎯 TODAS las DisciplineSubscriptions:');
    const disciplineSubs = await prisma.disciplineSubscription.findMany({
      where: {
        studentId: 59
      },
      include: {
        Usuario_DisciplineSubscription_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    
    if (disciplineSubs.length > 0) {
      disciplineSubs.forEach((ds, idx) => {
        console.log(`\n   DisciplineSubscription #${idx + 1}:`);
        console.log('      Status:', ds.status);
        console.log('      Mentor:', ds.Usuario_DisciplineSubscription_mentorIdToUsuario?.nombre);
        console.log('      Start Date:', ds.startDate);
        console.log('      End Date:', ds.endDate);
        console.log('      Created At:', ds.createdAt);
      });
    } else {
      console.log('   ❌ No hay registros de DisciplineSubscription');
    }
    
    console.log('\n✅ Verificación completa');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser59AllData();
