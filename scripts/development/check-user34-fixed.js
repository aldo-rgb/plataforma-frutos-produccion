const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('👤 Usuario 34: v1@next.com');
  
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: 34 }
  });
  
  console.log('\n📋 Carta ID:', carta.id, '- Estado:', carta.estado);
  console.log('Fecha actualización:', carta.fechaActualizacion);
  
  const metas = await prisma.meta.findMany({
    where: { cartaId: carta.id },
    include: { acciones: true }
  });
  
  console.log(`\n🎯 ${metas.length} Metas encontradas:`);
  let totalAcciones = 0;
  metas.forEach(m => {
    console.log(`  - ${m.categoria}: ${m.acciones.length} acciones`);
    totalAcciones += m.acciones.length;
  });
  console.log(`Total acciones: ${totalAcciones}`);
  
  const tasks = await prisma.taskInstance.findMany({
    where: { usuarioId: 34 },
    select: { id: true, dueDate: true, status: true },
    orderBy: { dueDate: 'asc' },
    take: 10
  });
  
  console.log(`\n📊 ${tasks.length > 0 ? tasks.length + ' tareas' : 'SIN TAREAS'}`);
  
  if (tasks.length === 0) {
    console.log('\n❌ PROBLEMA: Carta APROBADA pero NO tiene tareas generadas');
    console.log('Necesitas ejecutar: npx tsx scripts/generate-tasks-v1.ts');
  } else {
    tasks.slice(0, 5).forEach(t => {
      console.log(`  ${t.dueDate.toISOString().split('T')[0]} - ${t.status}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
