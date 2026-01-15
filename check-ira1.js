const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Buscar el usuario
  const usuario = await prisma.usuario.findFirst({
    where: { email: 'ira1@zero.com' }
  });
  
  if (!usuario) {
    console.log('❌ Usuario no encontrado');
    return;
  }
  
  console.log('=== USUARIO ===');
  console.log(`ID: ${usuario.id}`);
  console.log(`Nombre: ${usuario.nombre}`);
  console.log(`Email: ${usuario.email}`);
  console.log(`Rol: ${usuario.rol}`);
  console.log(`OrganizationId: ${usuario.organizationId}`);
  
  // Buscar todos sus enrollments
  console.log('\n=== ENROLLMENTS ===');
  const enrollments = await prisma.vision_enrollments.findMany({
    where: { userId: usuario.id },
    include: {
      Vision: { select: { id: true, nombre: true } }
    }
  });
  
  if (enrollments.length === 0) {
    console.log('❌ No tiene enrollments');
  } else {
    for (const e of enrollments) {
      // Buscar el producto por separado
      const producto = e.productId ? await prisma.schoolProduct.findUnique({
        where: { id: e.productId },
        select: { id: true, levelType: true, name: true }
      }) : null;
      
      console.log(`\n  📋 Enrollment ${e.id}:`);
      console.log(`     - Visión: ${e.visionId} - ${e.Vision?.nombre}`);
      console.log(`     - ProductId: ${e.productId}`);
      console.log(`     - Producto: ${producto?.levelType} - ${producto?.name}`);
      console.log(`     - Level: ${e.level}`);
      console.log(`     - Status: ${e.status}`);
      console.log(`     - AttendanceStatus: ${e.attendanceStatus}`);
      console.log(`     - PaymentStatus: ${e.paymentStatus}`);
      console.log(`     - CreatedAt: ${e.createdAt}`);
    }
  }
  
  // Buscar pagos
  console.log('\n=== PAGOS ===');
  const pagos = await prisma.payment.findMany({
    where: { userId: usuario.id },
    include: {
      UserLicense: {
        select: { id: true, level: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (pagos.length === 0) {
    console.log('❌ No tiene pagos registrados');
  } else {
    for (const p of pagos) {
      console.log(`\n  💰 Pago ${p.id}:`);
      console.log(`     - Monto: $${p.amount}`);
      console.log(`     - Status: ${p.status}`);
      console.log(`     - Level: ${p.level}`);
      console.log(`     - LicenseId: ${p.licenseId}`);
      console.log(`     - License Level: ${p.UserLicense?.level}`);
      console.log(`     - License Status: ${p.UserLicense?.status}`);
      console.log(`     - CreatedAt: ${p.createdAt}`);
    }
  }
  
  // Buscar licencias
  console.log('\n=== LICENCIAS ===');
  const licencias = await prisma.userLicense.findMany({
    where: { userId: usuario.id },
    include: {
      SchoolProduct: { select: { id: true, levelType: true, name: true, visionId: true } }
    }
  });
  
  if (licencias.length === 0) {
    console.log('❌ No tiene licencias');
  } else {
    for (const l of licencias) {
      console.log(`\n  🎫 Licencia ${l.id}:`);
      console.log(`     - Level: ${l.level}`);
      console.log(`     - Status: ${l.status}`);
      console.log(`     - ProductId: ${l.productId}`);
      console.log(`     - Producto: ${l.SchoolProduct?.levelType} - ${l.SchoolProduct?.name}`);
      console.log(`     - VisionId del producto: ${l.SchoolProduct?.visionId}`);
      console.log(`     - ActivatedAt: ${l.activatedAt}`);
    }
  }
  
  // Buscar productos de ADVANCED activos
  console.log('\n=== PRODUCTOS ADVANCED ACTIVOS ===');
  const advancedProducts = await prisma.schoolProduct.findMany({
    where: {
      levelType: 'ADVANCED',
      isActive: true,
      organizationId: usuario.organizationId
    },
    select: { id: true, name: true, visionId: true, startDate: true, endDate: true }
  });
  
  for (const p of advancedProducts) {
    console.log(`  Producto ${p.id}: visionId=${p.visionId}, ${p.startDate?.toISOString().split('T')[0]} - ${p.endDate?.toISOString().split('T')[0]}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
