const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar usuarios
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { nombre: { contains: 'Yessenia' } },
        { nombre: { contains: 'Samantha' } }
      ]
    },
    select: { id: true, nombre: true }
  });
  console.log('Usuarios:', users);

  // Buscar sus asignaciones de metamorfosis
  for (const user of users) {
    const assignments = await prisma.metamorfosisAssignment.findMany({
      where: { participantId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    console.log('\nAsignaciones de', user.nombre, ':', assignments.length);
    assignments.forEach(a => {
      console.log('  - ID:', a.id, 'Status:', a.status, 'Created:', a.createdAt);
    });
  }

  // Buscar todas las AdminTasks recientes
  const allTasks = await prisma.adminTask.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      taskType: true,
      title: true,
      createdAt: true
    }
  });
  console.log('\nÚltimas 10 AdminTasks:', allTasks);

  // Buscar TaskSubmissions de los usuarios
  for (const user of users) {
    const submissions = await prisma.taskSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        adminTask: { select: { title: true, taskType: true } }
      }
    });
    console.log('\nSubmissions de', user.nombre, ':');
    submissions.forEach(s => {
      console.log('  - Task:', s.adminTask?.title, 'Type:', s.adminTask?.taskType, 'Status:', s.status);
    });
  }
}

check().then(() => prisma.$disconnect()).catch(e => {
  console.error(e);
  prisma.$disconnect();
});
