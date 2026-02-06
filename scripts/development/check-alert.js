const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlert() {
  try {
    // Buscar alerta para Usuario 10 / Tarea 1904
    const alerts = await prisma.mentorAlert.findMany({
      where: {
        taskInstanceId: 1904
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
            dueDate: true,
            status: true,
            postponeCount: true
          }
        }
      }
    });

    console.log('🔔 Alertas encontradas:', alerts.length);
    
    if (alerts.length > 0) {
      console.log('\n📋 Detalles de alertas:');
      alerts.forEach(alert => {
        console.log({
          id: alert.id,
          mentorId: alert.mentorId,
          usuario: alert.Usuario.nombre,
          mensaje: alert.message,
          leida: alert.read,
          tarea: alert.TaskInstance
        });
      });
    } else {
      console.log('❌ No se encontraron alertas para la tarea 1904');
      
      // Verificar la tarea
      const task = await prisma.taskInstance.findUnique({
        where: { id: 1904 },
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              assignedMentorId: true
            }
          }
        }
      });
      
      console.log('\n📋 Tarea 1904:', task);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlert();
