const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'ira1@zero.com';
  
  // Buscar el usuario
  const usuario = await prisma.usuario.findFirst({
    where: { email }
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
  
  console.log(`Total enrollments: ${enrollments.length}`);
  for (const e of enrollments) {
    console.log(`\n  📋 Enrollment ${e.id}:`);
    console.log(`     - Visión: ${e.visionId} - ${e.Vision?.nombre}`);
    console.log(`     - Level: ${e.level}`);
    console.log(`     - AttendanceStatus: ${e.attendanceStatus}`);
    console.log(`     - PaymentStatus: ${e.paymentStatus}`);
  }
  
  // ¿Tiene enrollment de ADVANCED?
  const advancedEnrollment = enrollments.find(e => e.level === 'ADVANCED');
  console.log(`\n🔍 ¿Tiene enrollment ADVANCED?: ${advancedEnrollment ? 'SÍ' : 'NO'}`);
  
  // Buscar licencias
  console.log('\n=== LICENCIAS ===');
  const licencias = await prisma.userLicense.findMany({
    where: { userId: usuario.id }
  });
  
  console.log(`Total licencias: ${licencias.length}`);
  for (const l of licencias) {
    console.log(`\n  🎫 Licencia ${l.id}:`);
    console.log(`     - Level: ${l.level}`);
    console.log(`     - Status: ${l.status}`);
    console.log(`     - ProductId: ${l.productId}`);
    console.log(`     - ActivatedAt: ${l.activatedAt}`);
    console.log(`     - Code: ${l.licenseCode}`);
  }
  
  // ¿Tiene licencia de ADVANCED?
  const advancedLicense = licencias.find(l => l.level === 'ADVANCED');
  console.log(`\n🔍 ¿Tiene licencia ADVANCED?: ${advancedLicense ? 'SÍ - Status: ' + advancedLicense.status : 'NO'}`);
  
  // Buscar productos de ADVANCED de la visión del usuario
  console.log('\n=== PRODUCTOS ADVANCED EN SU VISIÓN ===');
  const basicEnrollment = enrollments.find(e => e.level === 'BASIC');
  if (basicEnrollment) {
    const advProduct = await prisma.schoolProduct.findFirst({
      where: {
        visionId: basicEnrollment.visionId,
        levelType: 'ADVANCED',
        isActive: true
      }
    });
    
    if (advProduct) {
      console.log(`Producto ADVANCED encontrado: ID=${advProduct.id}`);
      console.log(`  - Fechas: ${advProduct.startDate?.toISOString().split('T')[0]} - ${advProduct.endDate?.toISOString().split('T')[0]}`);
      
      // Ver si la licencia del usuario apunta a este producto
      if (advancedLicense) {
        console.log(`\n🔍 ¿Su licencia ADVANCED apunta al producto correcto?`);
        console.log(`   - Licencia productId: ${advancedLicense.productId}`);
        console.log(`   - Producto ADVANCED id: ${advProduct.id}`);
        console.log(`   - Match: ${advancedLicense.productId === advProduct.id ? '✅ SÍ' : '❌ NO'}`);
      }
    } else {
      console.log('❌ No hay producto ADVANCED activo en su visión');
    }
  }
  
  // Ver enrollments de ADVANCED en la visión 2
  console.log('\n=== OTROS ENROLLMENTS ADVANCED EN VISIÓN 2 ===');
  const otrosAdvanced = await prisma.vision_enrollments.findMany({
    where: {
      visionId: 2,
      level: 'ADVANCED'
    },
    include: {
      Usuario_vision_enrollments_userIdToUsuario: {
        select: { id: true, nombre: true, email: true }
      }
    }
  });
  
  console.log(`Total usuarios con enrollment ADVANCED en visión 2: ${otrosAdvanced.length}`);
  for (const e of otrosAdvanced) {
    const u = e.Usuario_vision_enrollments_userIdToUsuario;
    console.log(`  - ${u.nombre} (${u.email}) - Status: ${e.attendanceStatus}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
