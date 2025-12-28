const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUser27Tasks() {
  console.log('🔍 Verificando tareas del usuario 27...\n');

  // 1. Verificar carta
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: 27 },
    select: {
      id: true,
      estado: true,
      finanzasDeclaracion: true,
      relacionesDeclaracion: true,
      saludDeclaracion: true
    }
  });
  console.log('📋 Carta:', carta);

  // 2. Verificar metas
  if (carta) {
    const metas = await prisma.meta.findMany({
      where: { cartaId: carta.id },
      select: {
        id: true,
        categoria: true,
        metaPrincipal: true,
        status: true
      }
    });
    console.log('\n🎯 Metas encontradas:', metas.length);
    metas.forEach(m => console.log(`  - ${m.categoria}: ${m.metaPrincipal} (${m.status})`));

    // 3. Verificar acciones de las metas
    if (metas.length > 0) {
      const acciones = await prisma.accion.findMany({
        where: { 
          metaId: { in: metas.map(m => m.id) }
        },
        select: {
          id: true,
          metaId: true,
          texto: true,
          frequency: true,
          assignedDays: true
        },
        take: 5
      });
      console.log('\n⚡ Acciones encontradas:', acciones.length);
      acciones.forEach(a => console.log(`  - ${a.texto} (${a.frequency}, days: ${a.assignedDays})`));

      // 4. Verificar TaskInstances
      const tasks = await prisma.taskInstance.findMany({
        where: { usuarioId: 27 },
        select: {
          id: true,
          accionId: true,
          dueDate: true,
          status: true,
          createdAt: true
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      });
      console.log('\n📅 TaskInstances encontradas:', tasks.length);
      if (tasks.length > 0) {
        console.log('\nPrimeras 10 tareas:');
        tasks.forEach(t => {
          const dateStr = t.dueDate.toISOString().split('T')[0];
          console.log(`  - ID ${t.id}: ${dateStr} (${t.status})`);
        });
      } else {
        console.log('  ❌ NO HAY TASKINSTANCES GENERADAS');
      }
    }
  }

  await prisma.$disconnect();
}

debugUser27Tasks().catch(console.error);
