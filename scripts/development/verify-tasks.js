const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTasks() {
  try {
    const userId = 59; // Juan Carlos
    
    console.log('🔍 Verificando tareas creadas...\n');
    
    const totalTasks = await prisma.taskInstance.count({
      where: { usuarioId: userId }
    });
    
    console.log(`✅ Total de tareas en BD: ${totalTasks}`);
    
    if (totalTasks === 0) {
      console.log('❌ No hay tareas en la base de datos');
      return;
    }
    
    // Tareas de hoy
    const today = new Date('2025-12-22T06:00:00.000Z');
    const tomorrow = new Date('2025-12-23T06:00:00.000Z');
    
    const tareasHoy = await prisma.taskInstance.findMany({
      where: {
        usuarioId: userId,
        dueDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      }
    });
    
    console.log(`\n📅 Tareas para HOY (22 dic 2025): ${tareasHoy.length}`);
    tareasHoy.forEach(t => {
      console.log(`   - ${t.Accion.texto.substring(0, 50)}... (Due: ${t.dueDate})`);
    });
    
    // Primeras 10 tareas
    const primeras = await prisma.taskInstance.findMany({
      where: { usuarioId: userId },
      take: 10,
      orderBy: { dueDate: 'asc' },
      include: {
        Accion: true
      }
    });
    
    console.log(`\n📊 Primeras 10 tareas por fecha:`);
    primeras.forEach(t => {
      const fecha = new Date(t.dueDate);
      console.log(`   - ${fecha.toLocaleDateString('es-MX')}: ${t.Accion.texto.substring(0, 40)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTasks();
