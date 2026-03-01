const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const gcCallLogs = await prisma.gCCallLog.findMany({
      where: { participantId: 176 },
      take: 2,
      select: {
        id: true,
        trainingType: true,
        Usuario_GCCallLog_gameChangerIdToUsuario: {
          select: { id: true, nombre: true }
        },
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });
    console.log('GCCallLog OK:', gcCallLogs.length);
    
    const gcCallAttempts = await prisma.gCCallAttempt.findMany({
      where: { participantId: 176 },
      take: 2,
      select: {
        id: true,
        Usuario_GCCallAttempt_gameChangerIdToUsuario: {
          select: { id: true, nombre: true }
        }
      }
    });
    console.log('GCCallAttempt OK:', gcCallAttempts.length);
  } catch (e) {
    console.error('Error:', e.message);
  }
  await prisma.$disconnect();
}
test();
