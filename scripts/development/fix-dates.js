const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDates() {
  console.log('🔧 Actualizando fechas de tareas administrativas...');
  
  // Obtener todas las tareas con fechaLimite o fechaEvento
  const tareas = await prisma.adminTask.findMany({
    where: {
      OR: [
        { fechaLimite: { not: null } },
        { fechaEvento: { not: null } }
      ]
    }
  });
  
  console.log(`📦 Encontradas ${tareas.length} tareas para actualizar`);
  
  for (const tarea of tareas) {
    const updateData = {};
    
    if (tarea.fechaLimite) {
      const fecha = new Date(tarea.fechaLimite);
      // Extraer el día en UTC y crear fecha local con hora 12:00
      const year = fecha.getUTCFullYear();
      const month = fecha.getUTCMonth();
      const day = fecha.getUTCDate();
      updateData.fechaLimite = new Date(year, month, day, 12, 0, 0, 0);
      console.log(`  ✏️  ${tarea.titulo}: ${fecha.toISOString()} → ${updateData.fechaLimite.toISOString()}`);
    }
    
    if (tarea.fechaEvento) {
      const fecha = new Date(tarea.fechaEvento);
      const year = fecha.getUTCFullYear();
      const month = fecha.getUTCMonth();
      const day = fecha.getUTCDate();
      updateData.fechaEvento = new Date(year, month, day, 12, 0, 0, 0);
    }
    
    await prisma.adminTask.update({
      where: { id: tarea.id },
      data: updateData
    });
  }
  
  console.log('✅ Fechas actualizadas correctamente');
  await prisma.$disconnect();
}

fixDates().catch(console.error);
