import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Buscar Chris Quantum
  const mentor = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Chris' } },
    select: { id: true, nombre: true }
  });
  
  if (!mentor) {
    console.log('Mentor Chris no encontrado');
    return;
  }
  
  console.log('Mentor:', mentor.nombre, '(ID:', mentor.id, ')');
  
  // Ver DisciplineSchedule
  const schedule = await prisma.disciplineSchedule.findUnique({
    where: { mentorId: mentor.id }
  });
  
  if (schedule) {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    console.log('\n=== DISCIPLINE SCHEDULE ===');
    console.log('Días permitidos:', schedule.allowedDays.map(d => dias[d]).join(', '));
    console.log('Horario:', schedule.startTime, '-', schedule.endTime);
    console.log('Activo:', schedule.isActive);
  } else {
    console.log('\nNo tiene DisciplineSchedule configurado');
  }
  
  // También ver si hay slots ocupados por DisciplineSubscription
  const suscripciones = await prisma.disciplineSubscription.findMany({
    where: { mentorId: mentor.id },
    take: 10
  });
  
  console.log('\n=== SUSCRIPCIONES ACTIVAS ===');
  console.log('Total suscripciones:', suscripciones.length);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  suscripciones.forEach(s => {
    console.log(`  - ${dias[s.day1]} ${s.time1} / ${dias[s.day2]} ${s.time2}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
