const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const usuarios = [
  { buscar: 'Herlinda Aguilar', monto: 6500, metodo: 'efectivo' },
  { buscar: 'Griselda Alafita', monto: 5500, metodo: 'Tarjeta Deb' },
  { buscar: 'Ángel Castellanos', monto: 6500, metodo: 'Trans' },
  { buscar: 'Emma Castellanos', monto: 6500, metodo: 'Trans' },
  { buscar: 'Antonia García', monto: 6500, metodo: 'Efec' },
  { buscar: 'Herlinda Huerta', monto: 5500, metodo: 'tarjeta Deb' },
  { buscar: 'Edith Noemí', monto: 6500, metodo: 'Tarjeta Deb' },
  { buscar: 'Juana María Solórzano', monto: 12500, metodo: 'Trans' },
  { buscar: 'Ana Edith Tomás', monto: 6500, metodo: 'Tarjeta' },
  { buscar: 'Alejandra Hernández', monto: 6500, metodo: 'Tarjeta Deb' }
];

async function checkUsuarios() {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN DE TICKETS AVANZADO PAGADOS');
  console.log('='.repeat(80));
  
  for (const item of usuarios) {
    console.log('\n' + '-'.repeat(60));
    console.log('🔍 Buscando:', item.buscar, '| Monto esperado:', item.monto, '| Método:', item.metodo);
    
    // Buscar usuarios que coincidan
    const users = await prisma.usuario.findMany({
      where: {
        nombre: { contains: item.buscar, mode: 'insensitive' }
      },
      select: { id: true, nombre: true, email: true, telefono: true }
    });
    
    if (users.length === 0) {
      console.log('   ❌ Usuario NO encontrado');
      continue;
    }
    
    // Mostrar todos los encontrados y sus tickets
    for (const user of users) {
      console.log('\n   ✅ Usuario:', user.nombre);
      console.log('      ID:', user.id, '| Email:', user.email);
      
      // Buscar tickets de ADVANCED
      const tickets = await prisma.ticket.findMany({
        where: {
          ownerId: user.id,
          level: 'ADVANCED'
        },
        include: {
          vision: { select: { id: true, nombre: true } }
        }
      });
      
      if (tickets.length === 0) {
        console.log('      ⚠️ NO tiene tickets de ADVANCED');
      } else {
        console.log('      �� Tickets ADVANCED:', tickets.length);
        for (const t of tickets) {
          const statusEmoji = t.paymentStatus === 'PAID' ? '✅' : '❌';
          console.log('         ' + statusEmoji, 'Status:', t.status, '| PaymentStatus:', t.paymentStatus, '| Visión:', t.vision?.nombre || 'N/A');
        }
      }
      
      // Buscar enrollments de ADVANCED
      const enrollments = await prisma.vision_enrollments.findMany({
        where: {
          userId: user.id,
          level: 'ADVANCED'
        },
        include: {
          Vision: { select: { id: true, nombre: true } }
        }
      });
      
      if (enrollments.length > 0) {
        console.log('      📝 Enrollments ADVANCED:', enrollments.length);
        for (const e of enrollments) {
          const statusEmoji = e.paymentStatus === 'PAID' ? '✅' : '❌';
          console.log('         ' + statusEmoji, 'Visión:', e.Vision?.nombre, '| PaymentStatus:', e.paymentStatus);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('FIN DE VERIFICACIÓN');
  console.log('='.repeat(80));
  
  await prisma.$disconnect();
}

checkUsuarios().catch(e => {
  console.error(e);
  process.exit(1);
});
