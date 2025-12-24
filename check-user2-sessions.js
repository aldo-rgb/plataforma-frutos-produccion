const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Verificando sesiones de User 2 (ID: 6)...\n');
  
  // 1. Verificar enrollment actual
  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      userId: 6,
      status: 'ACTIVE'
    }
  });
  
  console.log('📋 Enrollment actual:');
  console.log('- mentorId:', enrollment.mentorId, '(Mentor2)');
  console.log('- enrollmentId:', enrollment.id);
  
  // 2. Ver todas las sesiones agendadas
  const sessions = await prisma.callBooking.findMany({
    where: {
      programEnrollmentId: enrollment.id
    },
    select: {
      id: true,
      mentorId: true,
      scheduledAt: true,
      status: true
    },
    orderBy: {
      scheduledAt: 'asc'
    }
  });
  
  console.log('\n📅 CallBookings encontrados:', sessions.length);
  
  const porMentor = {};
  const porStatus = {};
  
  sessions.forEach(s => {
    porMentor[s.mentorId] = (porMentor[s.mentorId] || 0) + 1;
    porStatus[s.status] = (porStatus[s.status] || 0) + 1;
  });
  
  console.log('\n👥 Sesiones por mentor:');
  for (const [mentorId, count] of Object.entries(porMentor)) {
    const mentor = await prisma.usuario.findUnique({
      where: { id: parseInt(mentorId) },
      select: { nombre: true }
    });
    console.log(`  · Mentor ${mentorId} (${mentor?.nombre}): ${count} sesiones`);
  }
  
  console.log('\n📊 Sesiones por estado:');
  for (const [status, count] of Object.entries(porStatus)) {
    console.log(`  · ${status}: ${count} sesiones`);
  }
  
  console.log('\n🎯 PROBLEMA IDENTIFICADO:');
  console.log('El enrollment tiene mentorId = 14 (Mentor2)');
  console.log(`Pero las ${sessions.length} sesiones están con mentor ${sessions[0]?.mentorId} (mentor anterior)`);
  console.log('\n💡 SOLUCIÓN: Cancelar las sesiones del mentor anterior y permitir reagendar');
  
  await prisma.$disconnect();
}

check().catch(console.error);
