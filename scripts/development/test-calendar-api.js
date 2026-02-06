// Test para verificar que la API devuelve datos de tareas futuras
const userId = 2; // Carlos

console.log('\n🔍 PROBANDO API /api/tasks/calendar-summary\n');

// Simular lo que hace el componente: obtener 3 meses
const dates = [
  '2024-12', // prev
  '2025-01', // current (enero)
  '2025-02'  // next
];

console.log('📅 Meses a consultar:', dates);
console.log('\n--- Resultados ---\n');

// Como no podemos hacer fetch directamente, vamos a consultar la DB
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCalendarSummary() {
  try {
    // Para enero 2025
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');
    
    const tasks = await prisma.taskInstance.findMany({
      where: {
        usuarioId: userId,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        dueDate: true,
        status: true,
        evidenceStatus: true
      },
      orderBy: { dueDate: 'asc' }
    });
    
    console.log(`\n✅ Tareas en Enero 2025 para usuario ${userId}: ${tasks.length} tareas\n`);
    
    // Agrupar por día
    const byDate = {};
    tasks.forEach(t => {
      const key = t.dueDate.toISOString().split('T')[0];
      byDate[key] = (byDate[key] || 0) + 1;
    });
    
    console.log('📊 Distribución por día:');
    Object.entries(byDate)
      .sort()
      .forEach(([date, count]) => {
        console.log(`  ${date}: ${count} tareas`);
      });
    
    console.log('\n🎯 Primeras 5 tareas:\n');
    tasks.slice(0, 5).forEach(t => {
      console.log(`  - ${t.dueDate.toISOString().split('T')[0]} | ${t.status} | Evidence: ${t.evidenceStatus || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalendarSummary();
