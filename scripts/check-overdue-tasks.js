// Script para detectar tareas retrasadas más de 3 días y crear alertas para mentores
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOverdueTasks() {
  try {
    console.log('🔍 Buscando tareas retrasadas más de 3 días...\n');

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Buscar tareas con más de 3 días de retraso
    // originalDueDate es la fecha original sin reagendar
    // Si no hay originalDueDate, usar dueDate
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
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true
              }
            }
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

    console.log(`📊 Total de tareas retrasadas: ${overdueTasks.length}\n`);

    if (overdueTasks.length === 0) {
      console.log('✅ No hay tareas retrasadas más de 3 días');
      return;
    }

    let alertsCreated = 0;
    let alertsSkipped = 0;

    for (const task of overdueTasks) {
      // Saltar si no tiene mentor asignado
      if (!task.Usuario.assignedMentorId) {
        console.log(`⚠️  ${task.Usuario.nombre} no tiene mentor asignado - saltando`);
        alertsSkipped++;
        continue;
      }

      // Calcular días de retraso
      const baseDate = task.originalDueDate || task.dueDate;
      const daysOverdue = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));

      // Verificar si ya existe una alerta para esta tarea
      const existingAlert = await prisma.mentorAlert.findFirst({
        where: {
          mentorId: task.Usuario.assignedMentorId,
          taskInstanceId: task.id,
          type: 'RISK_ALERT',
          message: {
            contains: 'días de retraso'
          },
          read: false
        }
      });

      if (existingAlert) {
        console.log(`⏭️  Alerta ya existe para tarea ${task.id} - saltando`);
        alertsSkipped++;
        continue;
      }

      // Crear alerta para el mentor
      const alert = await prisma.mentorAlert.create({
        data: {
          mentorId: task.Usuario.assignedMentorId,
          usuarioId: task.usuarioId,
          taskInstanceId: task.id,
          type: 'RISK_ALERT',
          message: `⏰ ${task.Usuario.nombre} tiene la tarea "${task.Accion.texto}" del área ${task.Accion.Meta.categoria} con ${daysOverdue} días de retraso sin reagendar.`,
          read: false
        }
      });

      console.log(`✅ Alerta creada para mentor ${task.Usuario.Usuario_Usuario_assignedMentorIdToUsuario?.nombre}:`);
      console.log(`   - Estudiante: ${task.Usuario.nombre}`);
      console.log(`   - Tarea: ${task.Accion.texto}`);
      console.log(`   - Área: ${task.Accion.Meta.categoria}`);
      console.log(`   - Días de retraso: ${daysOverdue}`);
      console.log(`   - Alerta ID: ${alert.id}\n`);

      alertsCreated++;
    }

    console.log('\n📈 Resumen:');
    console.log(`   ✅ Alertas creadas: ${alertsCreated}`);
    console.log(`   ⏭️  Alertas saltadas (duplicadas): ${alertsSkipped}`);
    console.log(`   📊 Total procesado: ${overdueTasks.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
checkOverdueTasks();
