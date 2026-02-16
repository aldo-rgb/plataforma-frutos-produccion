const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const usuarios = [
  'Herlinda Aguilar Méndez',
  'Griselda Alafita Calvo',
  'Ángel Castellanos Méndez',
  'Emma Castellanos Delgado',
  'Antonia García Manuel',
  'Herlinda Huerta Pérez',
  'Edith Noemí Martínez',
  'Juana María Solórzano',
  'Ana Edith Tomás Ramírez',
  'Alejandra Hernández'
];

async function checkUsuarios() {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN DE TICKETS AVANZADO PAGADOS');
  console.log('='.repeat(80));
  
  for (const nombreBusqueda of usuarios) {
    console.log('\n' + '-'.repeat(60));
    console.log('🔍 Buscando:', nombreBusqueda);
    
    // Dividir nombre para buscar más flexible
    const partes = nombreBusqueda.split(' ');
    const primerNombre = partes[0];
    const apellido = partes.length > 1 ? partes[1] : '';
    
    // Buscar usuario
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nombre: { contains: nombreBusqueda, mode: 'insensitive' } },
          { nombre: { contains: primerNombre, mode: 'insensitive' } },
          { 
            AND: [
              { nombre: { contains: primerNombre, mode: 'insensitive' } },
              { nombre: { contains: apellido, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: { id: true, nombre: true, email: true, telefono: true }
    });
    
    if (!user) {
      console.log('   ❌ Usuario NO encontrado');
      continue;
    }
    
    console.log('   ✅ Usuario encontrado:');
    console.log('      ID:', user.id);
    console.log('      Nombre:', user.nombre);
    console.log('      Email:', user.email);
    console.log('      Teléfono:', user.telefono);
    
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
      console.log('   ⚠️ NO tiene tickets de ADVANCED');
    } else {
      console.log('   🎫 Tickets ADVANCED:', tickets.length);
      for (const t of tickets) {
        console.log('      -', t.id.substring(0, 8) + '...');
        console.log('        Status:', t.status);
        console.log('        PaymentStatus:', t.paymentStatus);
        console.log('        Type:', t.type);
        console.log('        Visión:', t.vision?.nombre || 'Sin visión');
        console.log('        Precio:', t.purchasePrice || 'N/A');
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
      console.log('   📝 Enrollments ADVANCED:', enrollments.length);
      for (const e of enrollments) {
        console.log('      - Visión:', e.Vision?.nombre);
        console.log('        EnrollmentStatus:', e.enrollmentStatus);
        console.log('        PaymentStatus:', e.paymentStatus);
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
