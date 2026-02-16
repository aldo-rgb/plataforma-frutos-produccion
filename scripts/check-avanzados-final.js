const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista de usuarios a verificar con sus datos
const usuariosBuscar = [
  { nombre: 'Herlinda Aguilar', monto: 6500, metodo: 'Efectivo' },
  { nombre: 'Alafita', monto: 5500, metodo: 'Tarjeta Deb' },
  { nombre: 'Angel Castellanos', monto: 6500, metodo: 'Trans' },
  { nombre: 'Emma Castellanos', monto: 6500, metodo: 'Trans' },
  { nombre: 'Antonia Garcia', monto: 6500, metodo: 'Efec' },
  { nombre: 'Herlinda Huerta', monto: 5500, metodo: 'Tarjeta Deb' },
  { nombre: 'Edith Noemi', monto: 6500, metodo: 'Tarjeta Deb' },
  { nombre: 'Solorzano', monto: 12500, metodo: 'Trans' },
  { nombre: 'Ana Edith Tomas', monto: 6500, metodo: 'Tarjeta' },
  { nombre: 'Alejandra Hernandez', monto: 6500, metodo: 'Tarjeta Deb' }
];

async function main() {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN DE TICKETS AVANZADO');
  console.log('='.repeat(80));
  
  const resultados = [];
  
  for (const item of usuariosBuscar) {
    console.log('\n' + '-'.repeat(60));
    console.log('🔍', item.nombre, '| $' + item.monto, item.metodo);
    
    // Buscar sin acentos
    const nombreSinAcento = item.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    const users = await prisma.usuario.findMany({
      where: {
        OR: [
          { nombre: { contains: item.nombre, mode: 'insensitive' } },
          { nombre: { contains: nombreSinAcento, mode: 'insensitive' } }
        ]
      },
      select: { id: true, nombre: true, email: true }
    });
    
    if (users.length === 0) {
      console.log('   ❌ NO ENCONTRADO');
      resultados.push({ ...item, estado: 'NO ENCONTRADO', usuario: null });
      continue;
    }
    
    for (const u of users) {
      console.log('   👤', u.id, '-', u.nombre, '-', u.email);
      
      // Buscar tickets ADVANCED
      const tickets = await prisma.ticket.findMany({
        where: { ownerId: u.id, level: 'ADVANCED' },
        include: { vision: { select: { nombre: true } } }
      });
      
      // Buscar enrollments ADVANCED  
      const enrolls = await prisma.vision_enrollments.findMany({
        where: { userId: u.id, level: 'ADVANCED' },
        include: { Vision: { select: { nombre: true } } }
      });
      
      const tieneTicket = tickets.some(t => t.paymentStatus === 'PAID' || t.status === 'ACTIVE');
      const tieneEnroll = enrolls.some(e => e.paymentStatus === 'PAID');
      
      if (tieneTicket || tieneEnroll) {
        console.log('      ✅ TIENE AVANZADO PAGADO');
        tickets.forEach(t => {
          console.log('         🎫 Ticket:', t.status, t.paymentStatus, '-', t.vision?.nombre);
        });
        enrolls.filter(e => e.level === 'ADVANCED').forEach(e => {
          console.log('         📝 Enroll:', e.paymentStatus, '-', e.Vision?.nombre);
        });
      } else {
        console.log('      ⚠️ SIN AVANZADO PAGADO');
        if (tickets.length > 0) {
          tickets.forEach(t => console.log('         🎫', t.level, t.status, t.paymentStatus));
        }
        if (enrolls.length > 0) {
          enrolls.forEach(e => console.log('         📝', e.level, e.paymentStatus));
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  await prisma.$disconnect();
}

main().catch(console.error);
