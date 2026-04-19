const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar a Irene Alcala por ID 1328
  const usuario = await prisma.usuario.findUnique({
    where: { id: 1328 },
    select: { id: true, nombre: true, email: true, telefono: true, createdAt: true }
  });
  
  if (!usuario) {
    console.log('Usuario no encontrado');
    return;
  }
  
  console.log('=== IRENE ALCALA - INFO DE PAGO ===\n');
  console.log('👤 Usuario:', usuario.nombre);
  console.log('📧 Email:', usuario.email);
  console.log('📱 Teléfono:', usuario.telefono);
  console.log('📅 Registrado:', usuario.createdAt);
  
  // Buscar enrollment en Vision
  const enrollment = await prisma.vision_enrollments.findFirst({
    where: { userId: usuario.id },
    orderBy: { enrolledAt: 'desc' }
  });
  
  if (enrollment) {
    console.log('\n📚 ENROLLMENT:');
    console.log('  Vision ID:', enrollment.visionId);
    console.log('  Level:', enrollment.level);
    console.log('  Status:', enrollment.enrollmentStatus);
    console.log('  Payment Status:', enrollment.paymentStatus);
    console.log('  Payment Method:', enrollment.paymentMethod);
    console.log('  Payment Provider:', enrollment.paymentProvider);
    console.log('  Payment Session ID:', enrollment.paymentSessionId);
    console.log('  Enrolled At:', enrollment.enrolledAt);
  } else {
    console.log('\n📚 ENROLLMENT: No encontrado');
  }
  
  // Buscar InstitutionalOrder
  const instOrders = await prisma.institutionalOrder.findMany({
    where: { userId: usuario.id },
    orderBy: { createdAt: 'desc' }
  });
  
  if (instOrders.length > 0) {
    console.log('\n🏛️ INSTITUTIONAL ORDERS:', instOrders.length);
    for (const o of instOrders) {
      console.log('  - ID:', o.id, '| Amount:', o.amount, '| Status:', o.status, '| Payment Status:', o.paymentStatus);
    }
  }
  
  // Buscar LicenseOrder
  const licOrders = await prisma.licenseOrder.findMany({
    where: { userId: usuario.id },
    orderBy: { createdAt: 'desc' }
  });
  
  if (licOrders.length > 0) {
    console.log('\n📜 LICENSE ORDERS:', licOrders.length);
    for (const o of licOrders) {
      console.log('  - ID:', o.id, '| Total:', o.totalAmount, '| Status:', o.status, '| Payment Method:', o.paymentMethod);
    }
  }
  
  // Buscar MentorPackageOrder
  const mentorOrders = await prisma.mentorPackageOrder.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { createdAt: 'desc' }
  });
  
  if (mentorOrders.length > 0) {
    console.log('\n👨‍🏫 MENTOR PACKAGE ORDERS:', mentorOrders.length);
    for (const o of mentorOrders) {
      console.log('  - ID:', o.id, '| Total:', o.total, '| Status:', o.status, '| Payment Method:', o.metodoPago);
    }
  }
  
  // Buscar Transacciones
  const transacciones = await prisma.transaccion.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { fecha: 'desc' }
  });
  
  if (transacciones.length > 0) {
    console.log('\n💰 TRANSACCIONES:', transacciones.length);
    for (const t of transacciones) {
      console.log('  - ID:', t.id, '| Tipo:', t.tipo, '| Cantidad:', t.cantidad, '| Fecha:', t.fecha);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
