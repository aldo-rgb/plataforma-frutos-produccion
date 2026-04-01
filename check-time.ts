import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Buscar una llamada de Brenda
  const brenda = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Brenda' } }
  });
  
  if (!brenda) {
    console.log('Brenda no encontrada');
    return;
  }
  
  console.log('Usuario:', brenda.nombre, '(ID:', brenda.id, ')');
  
  const enrollment = await prisma.programEnrollment.findFirst({
    where: { userId: brenda.id, status: 'ACTIVE' }
  });
  
  if (!enrollment) {
    console.log('Sin enrollment activo');
    return;
  }
  
  console.log('Enrollment ID:', enrollment.id);
  
  const nextCall = await prisma.callBooking.findFirst({
    where: {
      programEnrollmentId: enrollment.id,
      scheduledAt: { gte: new Date() }
    },
    orderBy: { scheduledAt: 'asc' }
  });
  
  if (!nextCall) {
    console.log('Sin próxima llamada');
    return;
  }
  
  console.log('\n=== Próxima Llamada ===');
  console.log('scheduledAt (raw):', nextCall.scheduledAt);
  console.log('scheduledAt (ISO):', nextCall.scheduledAt.toISOString());
  console.log('scheduledAt (UTC string):', nextCall.scheduledAt.toUTCString());
  
  // Formato México
  const timeStr = nextCall.scheduledAt.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City'
  });
  
  const dateStr = nextCall.scheduledAt.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Mexico_City'
  });
  
  console.log('Formateado México (hour24):', timeStr);
  console.log('Fecha México:', dateStr);
}

main().catch(console.error).finally(() => prisma.$disconnect());
