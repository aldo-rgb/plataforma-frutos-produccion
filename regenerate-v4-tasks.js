const { PrismaClient } = require('@prisma/client');
const { addDays, format } = require('date-fns');
const prisma = new PrismaClient();

async function regenerateV4Tasks() {
  try {
    const userId = 37; // v4@next.com
    
    console.log('\n🚀 REGENERANDO TAREAS PARA v4@next.com\n');
    
    // 1. Obtener la carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      select: { id: true }
    });
    
    if (!carta) {
      console.log('❌ No se encontró carta para este usuario');
      return;
    }
    
    console.log(`📜 Carta encontrada: ID ${carta.id}`);
    
    // 2. Obtener todas las acciones (tareas) de la carta
    const acciones = await prisma.accion.findMany({
      where: {
        Meta: {
          cartaId: carta.id
        }
      },
      include: {
        Meta: true
      }
    });
    
    console.log(`📋 Acciones encontradas: ${acciones.length}`);
    
    if (acciones.length === 0) {
      console.log('❌ No hay acciones en la carta. Primero debes crear las metas y acciones.');
      return;
    }
    
    // 3. Generar instancias de tareas para los próximos 90 días
    const startDate = new Date(); // HOY: 29 diciembre 2025
    const daysToGenerate = 90;
    
    console.log(`\n⏰ Generando tareas desde: ${format(startDate, 'yyyy-MM-dd')}`);
    console.log(`📅 Hasta: ${format(addDays(startDate, daysToGenerate), 'yyyy-MM-dd')}\n`);
    
    const tasksToCreate = [];
    
    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const currentDate = addDays(startDate, dayOffset);
      const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
      
      for (const accion of acciones) {
        let shouldCreateTask = false;
        
        // Determinar si se debe crear una tarea este día
        if (accion.frequency === 'DAILY') {
          shouldCreateTask = true;
        } else if (accion.frequency === 'WEEKLY' && accion.assignedDays) {
          // assignedDays es un array como [1, 3, 5] para Lunes, Miércoles, Viernes
          shouldCreateTask = accion.assignedDays.includes(dayOfWeek);
        } else if (accion.specificDate) {
          // Tarea de fecha específica
          const specificDate = new Date(accion.specificDate);
          shouldCreateTask = format(currentDate, 'yyyy-MM-dd') === format(specificDate, 'yyyy-MM-dd');
        }
        
        if (shouldCreateTask) {
          tasksToCreate.push({
            usuarioId: userId,
            accionId: accion.id,
            dueDate: currentDate,
            originalDueDate: currentDate,
            status: 'PENDING',
            postponeCount: 0
          });
        }
      }
    }
    
    console.log(`📦 Preparadas ${tasksToCreate.length} tareas para insertar...`);
    
    // Insertar todas las tareas en una sola operación
    await prisma.taskInstance.createMany({
      data: tasksToCreate
    });
    
    console.log(`✅ Tareas creadas exitosamente`);
    
    // Verificar resultado
    const allTasks = await prisma.taskInstance.findMany({
      where: { usuarioId: userId },
      orderBy: { dueDate: 'asc' }
    });
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total de tareas: ${allTasks.length}`);
    if (allTasks.length > 0) {
      console.log(`   Primera tarea: ${format(allTasks[0].dueDate, 'yyyy-MM-dd')}`);
      console.log(`   Última tarea: ${format(allTasks[allTasks.length - 1].dueDate, 'yyyy-MM-dd')}`);
      
      // Mostrar distribución por semana
      const thisWeek = allTasks.filter(t => {
        const diff = (new Date(t.dueDate) - startDate) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
      });
      console.log(`   Tareas esta semana: ${thisWeek.length}`);
    }
    
    console.log(`\n🎉 ¡Listo! Ahora el calendario mostrará las tareas futuras.`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateV4Tasks();
