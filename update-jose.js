const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'joseemmanuelgarciadiaz@hotmail.com' }
  });
  
  if (!user) {
    console.log('Usuario no encontrado');
    return;
  }
  
  console.log('Usuario encontrado:', user.id, user.name, user.email);
  
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      visionId: 16,
      hasActiveTicket: true,
      enrollmentPaid: true
    }
  });
  
  console.log('Usuario actualizado:');
  console.log('- Vision ID:', updated.visionId);
  console.log('- Ticket activo:', updated.hasActiveTicket);
  console.log('- Enrollment pagado:', updated.enrollmentPaid);
}

main().catch(console.error).finally(() => prisma.$disconnect());
