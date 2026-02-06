const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Monitor en tiempo real para el usuario 59
 * Verifica cambios cada 2 segundos
 */

let previousState = null;

async function checkUser59State() {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: 59 },
      select: {
        id: true,
        nombre: true,
        email: true,
        subscriptionStatus: true,
        organizationId: true,
        updatedAt: true
      }
    });

    const enrollments = await prisma.programEnrollment.findMany({
      where: { userId: 59 },
      select: {
        id: true,
        status: true,
        cycleType: true,
        mentorId: true,
        cycleStartDate: true,
        cycleEndDate: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const licenses = await prisma.licenseAssignment.findMany({
      where: { userId: 59 },
      select: {
        id: true,
        licenseCode: true,
        isActive: true,
        organizationId: true,
        visionId: true,
        activatedAt: true,
        expiresAt: true,
        assignedAt: true
      },
      orderBy: { assignedAt: 'desc' }
    });

    const visionParticipante = await prisma.visionParticipante.findMany({
      where: { participanteId: 59 },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const disciplineSub = await prisma.disciplineSubscription.findUnique({
      where: { studentId: 59 },
      select: {
        id: true,
        status: true,
        mentorId: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const callBookings = await prisma.callBooking.findMany({
      where: {
        programEnrollment: { userId: 59 }
      },
      select: {
        id: true,
        programEnrollmentId: true,
        scheduledAt: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const currentState = {
      user,
      enrollments,
      licenses,
      visionParticipante,
      disciplineSub,
      callBookingsCount: callBookings.length,
      callBookings: callBookings.slice(0, 3)
    };

    const currentStateJson = JSON.stringify(currentState);
    
    if (previousState && previousState !== currentStateJson) {
      console.log('\n🔔 ¡CAMBIO DETECTADO!', new Date().toLocaleTimeString());
      console.log('═══════════════════════════════════════════════════════\n');
      
      // Usuario
      if (JSON.stringify(previousState.user) !== JSON.stringify(currentState.user)) {
        console.log('👤 USUARIO ACTUALIZADO:');
        console.log('   Subscription Status:', currentState.user.subscriptionStatus);
        console.log('   Organization ID:', currentState.user.organizationId);
        console.log('   Updated At:', currentState.user.updatedAt);
        console.log();
      }

      // Enrollments
      if (JSON.stringify(previousState.enrollments) !== JSON.stringify(currentState.enrollments)) {
        console.log('📚 ENROLLMENTS CAMBIÓ:');
        console.log('   Total:', currentState.enrollments.length);
        currentState.enrollments.forEach((e, idx) => {
          console.log(`   #${idx + 1}:`);
          console.log('      ID:', e.id);
          console.log('      Status:', e.status);
          console.log('      Type:', e.cycleType);
          console.log('      Mentor ID:', e.mentorId);
          console.log('      Start:', e.cycleStartDate);
          console.log('      End:', e.cycleEndDate);
          console.log('      Created:', e.createdAt);
        });
        console.log();
      }

      // Licenses
      if (JSON.stringify(previousState.licenses) !== JSON.stringify(currentState.licenses)) {
        console.log('🎫 LICENCIAS CAMBIÓ:');
        console.log('   Total:', currentState.licenses.length);
        currentState.licenses.forEach((l, idx) => {
          console.log(`   #${idx + 1}:`);
          console.log('      ID:', l.id);
          console.log('      Code:', l.licenseCode);
          console.log('      Active:', l.isActive);
          console.log('      Org ID:', l.organizationId);
          console.log('      Vision ID:', l.visionId);
          console.log('      Assigned:', l.assignedAt);
          console.log('      Activated:', l.activatedAt);
          console.log('      Expires:', l.expiresAt);
        });
        console.log();
      }

      // Vision Participante
      if (JSON.stringify(previousState.visionParticipante) !== JSON.stringify(currentState.visionParticipante)) {
        console.log('🔮 VISION PARTICIPANTE CAMBIÓ:');
        console.log('   Total:', currentState.visionParticipante.length);
        currentState.visionParticipante.forEach((vp, idx) => {
          console.log(`   #${idx + 1}:`);
          console.log('      Vision:', vp.Vision?.nombre);
          console.log('      Vision ID:', vp.Vision?.id);
          console.log('      Start:', vp.Vision?.startDate);
          console.log('      End:', vp.Vision?.endDate);
        });
        console.log();
      }

      // Discipline Subscription
      if (JSON.stringify(previousState.disciplineSub) !== JSON.stringify(currentState.disciplineSub)) {
        console.log('🎯 DISCIPLINE SUBSCRIPTION CAMBIÓ:');
        if (currentState.disciplineSub) {
          console.log('   ID:', currentState.disciplineSub.id);
          console.log('   Status:', currentState.disciplineSub.status);
          console.log('   Mentor ID:', currentState.disciplineSub.mentorId);
          console.log('   Start:', currentState.disciplineSub.startDate);
          console.log('   End:', currentState.disciplineSub.endDate);
        } else {
          console.log('   ❌ Eliminada o no existe');
        }
        console.log();
      }

      // Call Bookings
      if (previousState.callBookingsCount !== currentState.callBookingsCount) {
        console.log('📞 CALL BOOKINGS CAMBIÓ:');
        console.log('   Total:', currentState.callBookingsCount);
        if (currentState.callBookings.length > 0) {
          console.log('   Últimas creadas:');
          currentState.callBookings.forEach((cb, idx) => {
            console.log(`      #${idx + 1}: Enrollment ${cb.programEnrollmentId}, ${cb.scheduledAt}, Status: ${cb.status}`);
          });
        }
        console.log();
      }

      console.log('═══════════════════════════════════════════════════════\n');
    } else if (!previousState) {
      console.log('🟢 Monitor iniciado -', new Date().toLocaleTimeString());
      console.log('📊 Estado inicial:');
      console.log('   Usuario:', currentState.user.nombre, '(', currentState.user.email, ')');
      console.log('   Subscription Status:', currentState.user.subscriptionStatus);
      console.log('   Enrollments:', currentState.enrollments.length);
      console.log('   Licenses:', currentState.licenses.length);
      console.log('   Vision Participante:', currentState.visionParticipante.length);
      console.log('   Discipline Sub:', currentState.disciplineSub ? '✅' : '❌');
      console.log('   Call Bookings:', currentState.callBookingsCount);
      console.log('\n⏳ Esperando cambios...\n');
    }

    previousState = currentState;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

console.log('🔍 MONITOR DE PAGO - Usuario 59 (Jorge Campos)');
console.log('═══════════════════════════════════════════════════════');
console.log('Este monitor detectará cambios en tiempo real cuando');
console.log('realices el proceso de pago.\n');
console.log('Presiona Ctrl+C para detener el monitor.\n');

// Check inicial
checkUser59State();

// Monitorear cada 2 segundos
const interval = setInterval(checkUser59State, 2000);

// Cleanup al salir
process.on('SIGINT', async () => {
  console.log('\n\n👋 Deteniendo monitor...');
  clearInterval(interval);
  await prisma.$disconnect();
  process.exit(0);
});
