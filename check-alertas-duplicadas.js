const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlertasDuplicadas() {
  try {
    console.log('🔍 Buscando alertas de procrastinación...\n');

    // Buscar todas las alertas no leídas
    const alertas = await prisma.mentorAlert.findMany({
      where: {
        read: false,
        type: 'RISK_ALERT'
      },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        },
        TaskInstance: {
          select: {
            id: true,
            accionId: true,
            dueDate: true,
            postponeCount: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total alertas no leídas: ${alertas.length}\n`);

    // Agrupar por usuario y tarea
    const alertasPorTarea = {};
    
    alertas.forEach((alert) => {
      const key = `${alert.usuarioId}-${alert.taskInstanceId}`;
      if (!alertasPorTarea[key]) {
        alertasPorTarea[key] = [];
      }
      alertasPorTarea[key].push(alert);
    });

    console.log('📋 Alertas por usuario y tarea:\n');
    Object.entries(alertasPorTarea).forEach(([key, alerts]) => {
      const [usuarioId, taskId] = key.split('-');
      console.log(`Usuario ${alerts[0].Usuario.nombre} - Tarea ${taskId}:`);
      console.log(`  🔔 ${alerts.length} alerta(s)`);
      
      if (alerts.length > 1) {
        console.log('  ⚠️ DUPLICADO DETECTADO:');
        alerts.forEach((alert, index) => {
          console.log(`    Alerta ${index + 1}:`);
          console.log(`      ID: ${alert.id}`);
          console.log(`      Mensaje: ${alert.message}`);
          console.log(`      Creada: ${alert.createdAt}`);
        });
      } else {
        console.log(`    ID: ${alerts[0].id}`);
        console.log(`    Mensaje: ${alerts[0].message}`);
        console.log(`    Creada: ${alerts[0].createdAt}`);
      }
      console.log('');
    });

    // Contar duplicados
    const duplicados = Object.values(alertasPorTarea).filter(alerts => alerts.length > 1);
    console.log(`\n⚠️ Total alertas duplicadas: ${duplicados.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlertasDuplicadas();
