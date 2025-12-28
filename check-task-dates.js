const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTaskDates() {
  console.log('\n🔍 Verificando fechas de tareas del usuario 27...\n');
  
  const tasks = await prisma.taskInstance.findMany({
    where: { usuarioId: 27 },
    select: {
      id: true,
      dueDate: true,
      status: true,
      Accion: {
        select: {
          texto: true,
          Meta: {
            select: {
              categoria: true
            }
          }
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  console.log(`📊 Total tareas: ${tasks.length}\n`);

  // Agrupar por mes
  const porMes = {};
  tasks.forEach(task => {
    const fecha = new Date(task.dueDate);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    if (!porMes[mes]) porMes[mes] = [];
    porMes[mes].push(task);
  });

  console.log('📅 Tareas por mes:');
  Object.keys(porMes).sort().forEach(mes => {
    console.log(`\n${mes}: ${porMes[mes].length} tareas`);
    porMes[mes].slice(0, 5).forEach(t => {
      console.log(`  - ${t.dueDate.toISOString().split('T')[0]} | ${t.status} | ${t.Accion.Meta.categoria} | ${t.Accion.texto.substring(0, 50)}`);
    });
    if (porMes[mes].length > 5) {
      console.log(`  ... y ${porMes[mes].length - 5} más`);
    }
  });

  await prisma.$disconnect();
}

checkTaskDates().catch(console.error);
