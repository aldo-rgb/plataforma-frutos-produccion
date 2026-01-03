const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.usuario.findUnique({
    where: { id: 34 },
    select: { id: true, nombre: true, email: true, rol: true }
  });
  console.log('Usuario 34:', user);
  
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: 34 },
    select: { id: true, estado: true, fechaActualizacion: true }
  });
  console.log('Carta:', carta);
  
  const metas = await prisma.meta.count({ where: { cartaId: carta?.id } });
  console.log('Metas:', metas);
  
  const acciones = await prisma.accion.count({ 
    where: { meta: { cartaId: carta?.id } } 
  });
  console.log('Acciones:', acciones);
  
  const tasks = await prisma.taskInstance.count({ where: { usuarioId: 34 } });
  console.log('Tasks:', tasks);
  
  if (tasks === 0 && carta?.estado === 'APROBADA') {
    console.log('\n⚠️ PROBLEMA: Carta APROBADA sin tareas!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
