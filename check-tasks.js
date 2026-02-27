const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userIds = [91, 115, 126];
  
  for (const userId of userIds) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true }
    });
    
    console.log('\n=== Usuario:', user.nombre, '(ID:', userId + ') ===');
    
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      select: { id: true }
    });
    
    if (!carta) {
      console.log('  NO TIENE CARTA');
      continue;
    }
    
    console.log('  Carta ID:', carta.id);
    
    const metasServiceTrans = await prisma.meta.findMany({
      where: { cartaId: carta.id, categoria: 'servicioTrans' },
      select: { id: true }
    });
    
    console.log('  Metas servicioTrans:', metasServiceTrans.length);
    
    if (metasServiceTrans.length > 0) {
      const acciones = await prisma.accion.findMany({
        where: { metaId: { in: metasServiceTrans.map(m => m.id) } },
        select: { id: true }
      });
      console.log('  Acciones:', acciones.length);
      
      if (acciones.length > 0) {
        const tasks = await prisma.taskInstance.findMany({
          where: { usuarioId: userId, accionId: { in: acciones.map(a => a.id) } },
          select: { id: true, status: true }
        });
        console.log('  TaskInstances:', tasks.length);
        tasks.forEach(t => console.log('    - Task', t.id, ':', t.status));
      }
    }
  }
}

main().then(() => process.exit(0));
