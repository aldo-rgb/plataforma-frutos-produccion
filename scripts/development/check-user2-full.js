const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Verificando estado completo de User 2 (ID: 6)...\n');
  
  // 1. Verificar enrollment
  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      userId: 6,
      status: 'ACTIVE'
    },
    include: {
      Usuario_ProgramEnrollment_mentorIdToUsuario: {
        select: {
          id: true,
          nombre: true,
          profileImage: true,
          imagen: true
        }
      }
    }
  });
  
  if (!enrollment) {
    console.log('❌ No hay enrollment activo');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Enrollment encontrado:');
  console.log('- Enrollment ID:', enrollment.id);
  console.log('- mentorId:', enrollment.mentorId);
  console.log('- Mentor:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario?.nombre);
  console.log('- totalWeeks:', enrollment.totalWeeks);
  
  // 2. Contar CallBookings
  const totalSessions = await prisma.callBooking.count({
    where: { programEnrollmentId: enrollment.id }
  });
  
  console.log('\n📊 CallBookings:');
  console.log('- Total CallBookings:', totalSessions);
  console.log('- needsReschedule:', totalSessions === 0 ? 'SÍ ✅' : 'NO ❌');
  
  // 3. Verificar slots del mentor
  const slots = await prisma.callAvailability.findMany({
    where: {
      mentorId: enrollment.mentorId,
      type: 'DISCIPLINE',
      isActive: true
    }
  });
  
  console.log('\n🕐 Slots disponibles del Mentor', enrollment.mentorId + ':');
  console.log('- Total slots configurados:', slots.length);
  slots.forEach(slot => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    console.log(`  · ${dias[slot.dayOfWeek]} de ${slot.startTime} a ${slot.endTime}`);
  });
  
  console.log('\n🎯 Conclusión:');
  if (totalSessions === 0 && slots.length > 0) {
    console.log('✅ User 2 necesita agendar sesiones Y el mentor tiene slots disponibles');
    console.log('   El frontend debería mostrar los slots para agendar');
  } else if (totalSessions === 0 && slots.length === 0) {
    console.log('❌ User 2 necesita agendar PERO el mentor NO tiene slots configurados');
  } else {
    console.log('ℹ️  User 2 ya tiene sesiones agendadas');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
