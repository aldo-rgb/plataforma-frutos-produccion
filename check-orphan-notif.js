const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'pruebamanuales2@icmty.com' }
  });
  
  console.log('Usuario:', user?.id, user?.nombre);
  
  if (user) {
    const notifications = await prisma.captaincyNotification.findMany({
      where: { userId: user.id },
      include: {
        TribeCaptainAssignment: true
      }
    });
    
    console.log('Notificaciones encontradas:', notifications.length);
    for (const n of notifications) {
      console.log('- ID:', n.id);
      console.log('  Title:', n.title);
      console.log('  isRead:', n.isRead);
      console.log('  assignmentId:', n.assignmentId);
      console.log('  Assignment exists:', !!n.TribeCaptainAssignment);
      if (n.TribeCaptainAssignment) {
        console.log('  Assignment status:', n.TribeCaptainAssignment.status);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
