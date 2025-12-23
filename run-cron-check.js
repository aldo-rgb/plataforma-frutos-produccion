const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOverdueTasks() {
  try {
    console.log('🔍 Iniciando chequeo de tareas retrasadas...');

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log('📅 Fecha límite:', threeDaysAgo.toISOString());
    console.log('📅 Fecha actual:', now.toISOString());

    // Buscar tareas con más de 3 días de retraso
    const overdueTasks = await prisma.taskInstance.findMany({
      where: {
        status: 'PENDING',
        OR: [
          {
            originalDueDate: {
              lt: threeDaysAgo
            }
          },
          {
            originalDueDate: null,
            dueDate: {
              lt: threeDaysAgo
            }
          }
        ]
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            assignedMentorId: true
          }
        },
        Accion: {
          include: {
            Meta: {
              select: {
                categoria: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Tareas retrasadas encontradas: ${overdueTasks.length}`);

    let alertsCreated = 0;
    let alertsSkipped = 0;

    for (const task of overdueTasks) {
      // Saltar si no tiene mentor asignado
      if (!task.Usuario.assignedMentorId) {
        console.log(`  ⏭️ Tarea ${task.id} sin mentor asignado`);
        alertsSkipped++;
        continue;
      }

      // Calcular días de retraso
      const baseDate = task.originalDueDate || task.dueDate;
      const daysOverdue = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`  📋 Tarea ${task.id}: ${task.Accion.texto} - ${daysOverdue} días de retraso`);

      // Verificar si ya existe una alerta para esta tarea (no leída)
      const existingAlert = await prisma.mentorAlert.findFirst({
        where: {
          mentorId: task.Usuario.assignedMentorId,
          taskInstanceId: task.id,
          type: 'RISK_ALERT',
          read: false
        }
      });

      if (existingAlert) {
        console.log(`  ⏭️ Ya existe alerta para tarea ${task.id}`);
        alertsSkipped++;
        continue;
      }

      // Crear alerta para el mentor
      await prisma.mentorAlert.create({
        data: {
          mentorId: task.Usuario.assignedMentorId,
          usuarioId: task.usuarioId,
          taskInstanceId: task.id,
          type: 'RISK_ALERT',
          message: `⏰ ${task.Usuario.nombre} tiene la tarea "${task.Accion.texto}" del área ${task.Accion.Meta.categoria} con ${daysOverdue} días de retraso sin reagendar.`,
          read: false
        }
      });

      console.log(`  ✅ Alerta creada para mentor ${task.Usuario.assignedMentorId}`);
      alertsCreated++;
    }

    console.log('\n✅ Chequeo completado:');
    console.log(`   Total retrasadas: ${overdueTasks.length}`);
    console.log(`   Alertas creadas: ${alertsCreated}`);
    console.log(`   Alertas omitidas: ${alertsSkipped}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOverdueTasks();
