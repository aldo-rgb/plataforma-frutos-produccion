const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Verificando sesión PENDING de User 2...\n');
  
  const enrollment = await prisma.programEnrollment.findFirst({
    where: { userId: 6, status: 'ACTIVE' }
  });
  
  const pendingSessions = await prisma.callBooking.findMany({
    where: {
      programEnrollmentId: enrollment.id,
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    },
    select: {
      id: true,
      mentorId: true,
      scheduledAt: true,
      status: true,
      weekNumber: true
    },
    orderBy: {
      scheduledAt: 'asc'
    }
  });
  
  console.log('📅 Sesiones ACTIVAS (PENDING/CONFIRMED):', pendingSessions.length);
  pendingSessions.forEach(s => {
    console.log(`  · ID: ${s.id}, Mentor: ${s.mentorId}, Fecha: ${s.scheduledAt}, Semana: ${s.weekNumber}, Status: ${s.status}`);
  });
  
  console.log('\n📊 Total esperado para Vision 1 (20 semanas):');
  console.log('  · Sesiones totales: 40 (20 semanas × 2)');
  console.log(`  · Sesiones activas actuales: ${pendingSessions.length}`);
  console.log(`  · Faltan: ${40 - pendingSessions.length} sesiones`);
  
  console.log('\n🎯 CONCLUSIÓN:');
  if (pendingSessions.length === 1) {
    console.log('User 2 solo tiene 1 sesión activa, necesita reagendar las 39 restantes');
    console.log('Debería mostrar la interfaz de agendamiento');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
