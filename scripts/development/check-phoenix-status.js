const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhoenixStatus() {
  try {
    console.log('🔥 Verificando Protocolo Fénix para User 1...\n');
    
    const phoenixSession = await prisma.phoenixSession.findFirst({
      where: {
        usuarioId: 1,
        exitedAt: null  // No ha salido = está activo
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (phoenixSession) {
      console.log('✅ PROTOCOLO FÉNIX ACTIVO\n');
      console.log('📋 Detalles:');
      console.log('  ID:', phoenixSession.id);
      console.log('  Creado:', phoenixSession.createdAt);
      console.log('  Razón:', phoenixSession.triggerReason);
      console.log('  Completado:', phoenixSession.completedAt || 'No');
      console.log('  Salió:', phoenixSession.exitedAt || 'No (Aún activo)');
      console.log('  Tareas Reprogramadas:', phoenixSession.tasksRescheduled);
      console.log('  Tareas Omitidas:', phoenixSession.tasksGracefullySkipped);
    } else {
      console.log('❌ PROTOCOLO FÉNIX NO ACTIVO');
      
      // Buscar todas las sesiones del usuario
      const allSessions = await prisma.phoenixSession.findMany({
        where: { usuarioId: 1 },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      if (allSessions.length > 0) {
        console.log('\n📜 Últimas 5 sesiones:');
        allSessions.forEach((session, index) => {
          console.log(`\n  ${index + 1}. Sesión ID ${session.id}:`);
          console.log('     Creado:', session.createdAt);
          console.log('     Activa:', session.exitedAt ? 'No' : 'Sí');
          console.log('     Salió:', session.exitedAt || 'No');
          console.log('     Completado:', session.completedAt || 'No');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhoenixStatus();
