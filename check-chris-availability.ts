import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mentor = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Chris' } },
    select: { id: true, nombre: true }
  });
  
  if (!mentor) {
    console.log('Mentor Chris no encontrado');
    return;
  }
  
  console.log('Mentor:', mentor.nombre, '(ID:', mentor.id, ')');
  
  // Verificar CallAvailability
  const availability = await prisma.callAvailability.findMany({
    where: { mentorId: mentor.id }
  });
  
  console.log('\n=== CallAvailability ===');
  console.log('Total registros:', availability.length);
  
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  availability.forEach(a => {
    console.log(`  ${dias[a.dayOfWeek]}: ${a.startTime}-${a.endTime} (${a.type}, active: ${a.isActive})`);
  });
  
  // Si no hay CallAvailability, debe haber algún fallback
  // Verificar qué mentor realmente tiene esos horarios de 5:00 a 8:00
  const mentoresConDisponibilidad = await prisma.callAvailability.findMany({
    where: {
      type: 'DISCIPLINE',
      isActive: true,
      startTime: '05:00'
    },
    take: 10
  });
  
  console.log('\n=== Mentores con horario 05:00 (DISCIPLINE) ===');
  for (const m of mentoresConDisponibilidad) {
    const mentor = await prisma.usuario.findUnique({
      where: { id: m.mentorId },
      select: { nombre: true }
    });
    console.log(`  ${mentor?.nombre} (ID: ${m.mentorId}): ${dias[m.dayOfWeek]} ${m.startTime}-${m.endTime}`);
  }
  
  // Ahora ver el DisciplineSchedule
  console.log('\n=== DisciplineSchedule ===');
  const schedules = await prisma.disciplineSchedule.findMany({
    take: 10
  });
  
  for (const s of schedules) {
    const mentor = await prisma.usuario.findUnique({
      where: { id: s.mentorId },
      select: { nombre: true }
    });
    console.log(`  ${mentor?.nombre} (ID: ${s.mentorId}): ${s.startTime}-${s.endTime}, días: ${s.allowedDays}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
