const { PrismaClient } = require('@prisma/client');
const { addDays, getDay, format } = require('date-fns');

const prisma = new PrismaClient();

// Función para determinar si se debe crear una tarea en una fecha
function shouldCreateTask(date, frequency, assignedDays) {
  const dayOfWeek = getDay(date); // 0 = Domingo, 1 = Lunes, ...

  switch (frequency) {
    case 'DAILY':
      return true;
      
    case 'WEEKLY':
      return assignedDays.includes(dayOfWeek);
      
    case 'BIWEEKLY': {
      const weekNumber = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
      return weekNumber % 2 === 0 && assignedDays.includes(dayOfWeek);
    }
      
    case 'MONTHLY':
      return date.getDate() === (assignedDays[0] || 1);
      
    default:
      return false;
  }
}

async function generateTasksForCarlos() {
  try {
    const userId = 48;
    const durationMonths = 3;
    
    console.log(`\n🎯 Generando tareas para Usuario ID: ${userId}`);
    console.log(`📅 Duración: ${durationMonths} meses\n`);

    // Buscar todas las acciones del usuario con su Meta y CartaFrutos
    const acciones = await prisma.accion.findMany({
      where: {
        Meta: {
          CartaFrutos: {
            usuarioId: userId
          }
        }
      },
      include: {
        Meta: {
          include: {
            CartaFrutos: true
          }
        }
      }
    });

    if (acciones.length === 0) {
      console.log('❌ No se encontraron acciones para este usuario');
      return;
    }

    console.log(`✅ Encontradas ${acciones.length} acciones\n`);

    let totalCreated = 0;

    for (const accion of acciones) {
      // Si no tiene frequency, asignar WEEKLY por defecto
      const frequency = accion.frequency || 'WEEKLY';
      const assignedDays = accion.assignedDays || [1, 3, 5]; // Lun, Mié, Vie por defecto

      console.log(`📝 Acción: "${accion.texto}"`);
      console.log(`   Frecuencia: ${frequency}`);
      console.log(`   Días: ${assignedDays}`);
      console.log(`   Área: ${accion.Meta.categoria}`);

      // Eliminar instancias futuras pendientes existentes
      await prisma.taskInstance.deleteMany({
        where: {
          accionId: accion.id,
          dueDate: { gte: new Date() },
          status: 'PENDING'
        }
      });

      // Generar instancias para los próximos X meses
      const tasksToCreate = [];
      const startDate = new Date();
      const endDate = addDays(startDate, durationMonths * 30); // Aproximadamente X meses

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        if (shouldCreateTask(currentDate, frequency, assignedDays)) {
          tasksToCreate.push({
            accionId: accion.id,
            usuarioId: userId,
            dueDate: new Date(currentDate),
            status: 'PENDING',
            postponeCount: 0
          });
        }
        currentDate = addDays(currentDate, 1);
      }

      // Crear todas las instancias en batch
      if (tasksToCreate.length > 0) {
        await prisma.taskInstance.createMany({
          data: tasksToCreate
        });
        console.log(`   ✅ Creadas ${tasksToCreate.length} instancias`);
        totalCreated += tasksToCreate.length;
      } else {
        console.log(`   ⚠️  No se crearon instancias (revisar frecuencia)`);
      }
      console.log('');
    }

    console.log(`\n🎉 ¡Proceso completado!`);
    console.log(`📊 Total de tareas generadas: ${totalCreated}\n`);

    // Mostrar resumen de tareas para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksToday = await prisma.taskInstance.findMany({
      where: {
        usuarioId: userId,
        dueDate: today
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      }
    });

    console.log(`📅 Tareas para HOY (${format(today, 'yyyy-MM-dd')}): ${tasksToday.length}`);
    tasksToday.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.Accion.texto} (${task.Accion.Meta.categoria})`);
    });

  } catch (error) {
    console.error('❌ Error generando tareas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
generateTasksForCarlos();
