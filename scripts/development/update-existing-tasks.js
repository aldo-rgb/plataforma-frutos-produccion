// Script para actualizar tareas existentes con originalDueDate
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateExistingTasks() {
  console.log('🔄 Actualizando tareas existentes con fecha original...\n');

  try {
    // Obtener todas las tareas que no tienen originalDueDate
    const tasks = await prisma.taskInstance.findMany({
      where: {
        originalDueDate: null
      },
      select: {
        id: true,
        dueDate: true,
        postponeCount: true
      }
    });

    console.log(`📋 Encontradas ${tasks.length} tareas sin fecha original\n`);

    // Actualizar cada tarea con su dueDate como originalDueDate
    for (const task of tasks) {
      await prisma.taskInstance.update({
        where: { id: task.id },
        data: {
          originalDueDate: task.dueDate,
          evidenceStatus: 'NONE' // Establecer estado por defecto
        }
      });
    }

    console.log(`✅ ${tasks.length} tareas actualizadas correctamente\n`);

    // Mostrar resumen
    const summary = await prisma.taskInstance.groupBy({
      by: ['evidenceStatus'],
      _count: true
    });

    console.log('📊 Resumen por estado de evidencia:');
    summary.forEach(s => {
      console.log(`   ${s.evidenceStatus}: ${s._count} tareas`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingTasks();
