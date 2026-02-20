const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nombres = [
    'Herlinda Aguilar',
    'Griselda Alafita',
    'Ángel Castellanos',
    'Emma Castellanos',
    'Antonia García',
    'Herlinda Huerta',
    'Edith Noemí',
    'Ana Edith Tomás',
    'Alejandra Hernández'
  ];
  
  console.log('=== STATUS DE PAGOS ===\n');
  
  for (const nombre of nombres) {
    const usuarios = await prisma.usuario.findMany({
      where: {
        nombre: { contains: nombre, mode: 'insensitive' }
      },
      select: { id: true, nombre: true, email: true }
    });
    
    for (const u of usuarios) {
      const enrollment = await prisma.vision_enrollments.findFirst({
        where: { userId: u.id },
        select: { id: true, visionId: true, level: true, enrollmentStatus: true },
        orderBy: { enrolledAt: 'desc' }
      });
      
      const orders = await prisma.order.findMany({
        where: { userId: u.id },
        select: { id: true, totalAmount: true, status: true, paymentStatus: true, paymentMethod: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      });
      const orden = orders[0];
      
      console.log('👤', u.nombre);
      console.log('   Email:', u.email);
      if (enrollment) {
        console.log('   Enrollment: Vision', enrollment.visionId, '| Level:', enrollment.level, '| Status:', enrollment.enrollmentStatus);
      } else {
        console.log('   Enrollment: ❌ No encontrado');
      }
      if (orden) {
        console.log('   Orden: Status:', orden.status, '| Pago:', orden.paymentStatus, '| Método:', orden.paymentMethod, '| Total: $' + orden.totalAmount);
      } else {
        console.log('   💳 Sin orden registrada');
      }
      console.log('');
    }
    
    if (usuarios.length === 0) {
      console.log('❌ No encontrado:', nombre, '\n');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
