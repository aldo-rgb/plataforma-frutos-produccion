const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  console.log('RESUMEN FINAL - VERIFICACIÓN TICKETS AVANZADO\n');
  console.log('='.repeat(80));
  
  const lista = [
    { id: 180, esperado: 'Herlinda Aguilar Méndez', monto: 6500, metodo: 'efectivo' },
    { id: 170, esperado: 'Griselda Alafita Calvo', monto: 5500, metodo: 'Tarjeta Deb' },
    { id: null, esperado: 'Ángel Castellanos Méndez', monto: 6500, metodo: 'Trans', nota: 'NO ENCONTRADO EN BD' },
    { id: 169, esperado: 'Emma Castellanos Delgado', monto: 6500, metodo: 'Trans' },
    { id: 304, esperado: 'Antonia García Manuel', monto: 6500, metodo: 'Efec' },
    { id: 967, esperado: 'Herlinda Huerta Pérez', monto: 5500, metodo: 'Tarjeta Deb' },
    { id: 177, esperado: 'Edith Noemí Martínez', monto: 6500, metodo: 'Tarjeta Deb' },
    { id: 196, esperado: 'Juana María Solórzano', monto: 12500, metodo: 'Trans' },
    { id: 186, esperado: 'Ana Edith Tomás Ramírez', monto: 6500, metodo: 'Tarjeta' },
    { id: 179, esperado: 'Alejandra Hernández', monto: 6500, metodo: 'Tarjeta Deb' }
  ];
  
  let conPago = 0;
  let sinPago = 0;
  let noEncontrado = 0;
  
  for (const item of lista) {
    console.log('\n' + '-'.repeat(60));
    console.log('ESPERADO:', item.esperado);
    console.log('PAGO: $' + item.monto, '-', item.metodo);
    
    if (!item.id) {
      console.log('❌ USUARIO NO ENCONTRADO EN BASE DE DATOS');
      noEncontrado++;
      continue;
    }
    
    const user = await p.usuario.findUnique({ where: { id: item.id }, select: { id: true, nombre: true, email: true } });
    console.log('ENCONTRADO:', user?.nombre, '(ID:', item.id + ')');
    console.log('EMAIL:', user?.email);
    
    const tickets = await p.ticket.findMany({ where: { ownerId: item.id, level: 'ADVANCED' } });
    const enrolls = await p.vision_enrollments.findMany({ where: { userId: item.id, level: 'ADVANCED' } });
    
    const ticketPagado = tickets.some(t => t.paymentStatus === 'PAID' || t.status === 'ACTIVE');
    const enrollPagado = enrolls.some(e => e.paymentStatus === 'PAID');
    
    if (ticketPagado) {
      console.log('✅ TIENE TICKET AVANZADO PAGADO');
      conPago++;
    } else if (enrollPagado) {
      console.log('✅ TIENE ENROLLMENT AVANZADO PAGADO');
      conPago++;
    } else {
      console.log('⚠️ NO TIENE TICKET/ENROLLMENT AVANZADO PAGADO');
      sinPago++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nRESUMEN:');
  console.log('✅ Con AVANZADO PAGADO:', conPago);
  console.log('⚠️ SIN AVANZADO PAGADO:', sinPago);
  console.log('❌ NO encontrados en BD:', noEncontrado);
  
  await p.$disconnect();
}
check();
