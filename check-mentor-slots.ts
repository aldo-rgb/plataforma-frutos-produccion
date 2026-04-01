import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Buscar Chris Quantum
  const mentor = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Chris' } },
    select: { id: true, nombre: true, email: true }
  });
  
  if (!mentor) {
    console.log('Mentor Chris no encontrado');
    return;
  }
  
  console.log('Mentor:', mentor.nombre, '(ID:', mentor.id, ')');
  
  // Ver su disponibilidad configurada
  const disponibilidad = await prisma.callAvailability.findMany({
    where: {
      mentorId: mentor.id,
      type: 'DISCIPLINE',
      isActive: true
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });
  
  console.log('\n=== DISPONIBILIDAD CONFIGURADA ===');
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  disponibilidad.forEach(d => {
    console.log(`${dias[d.dayOfWeek]}: ${d.startTime} - ${d.endTime}`);
  });
  
  // Ver reservas existentes
  const reservas = await prisma.callBooking.findMany({
    where: {
      mentorId: mentor.id,
      type: 'DISCIPLINE',
      status: { in: ['PENDING', 'CONFIRMED'] }
    },
    orderBy: { scheduledAt: 'asc' },
    take: 20
  });
  
  console.log('\n=== RESERVAS ACTIVAS ===');
  reservas.forEach(r => {
    const fecha = new Date(r.scheduledAt);
    const dia = dias[fecha.getDay()];
    const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    console.log(`${dia} ${hora} - StudentID: ${r.studentId} (${r.status})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
