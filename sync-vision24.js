const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncEnrollmentTasksForUser(userId) {
  const invitedCount = await prisma.usuario.count({
    where: { invitedBy: userId }
  });

  if (invitedCount === 0) {
    return { userId, status: 'no_invites', invitedCount: 0, completedTasks: 0 };
  }

  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: userId },
    select: { id: true }
  });

  if (!carta) {
    return { userId, status: 'no_carta', invitedCount, completedTasks: 0 };
  }

  const pendingTasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId: userId,
      status: 'PENDING',
      Accion: {
        Meta: {
          categoria: 'servicioTrans',
          cartaId: carta.id
        }
      }
    },
    orderBy: { id: 'asc' },
    select: { id: true }
  });

  const completedTasks = await prisma.taskInstance.count({
    where: {
      usuarioId: userId,
      status: 'COMPLETED',
      Accion: {
        Meta: {
          categoria: 'servicioTrans',
          cartaId: carta.id
        }
      }
    }
  });

  const tasksToComplete = invitedCount - completedTasks;

  if (tasksToComplete <= 0) {
    return { userId, status: 'already_synced', invitedCount, completedTasks };
  }

  const tasksToMark = pendingTasks.slice(0, tasksToComplete);
  let markedCount = 0;

  for (const task of tasksToMark) {
    await prisma.taskInstance.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
    markedCount++;
    console.log('   Tarea', task.id, 'completada');
  }

  return {
    userId,
    status: 'synced',
    invitedCount,
    completedTasksAfter: completedTasks + markedCount,
    newlyCompleted: markedCount
  };
}

async function main() {
  const userIds = [91, 115, 126];
  
  for (const userId of userIds) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true }
    });
    console.log('\n=== Sincronizando:', user.nombre, '(ID:', userId + ') ===');
    
    const result = await syncEnrollmentTasksForUser(userId);
    console.log('Resultado:', JSON.stringify(result, null, 2));
  }
}

main().then(() => process.exit(0));
