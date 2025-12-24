const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Verificando datos del Director Prueba...\n');
  
  const director = await prisma.usuario.findUnique({
    where: { email: 'director@frutos.com' },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      organizationId: true,
      Organization: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  if (!director) {
    console.log('❌ Director no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log('👤 Director:', director.nombre);
  console.log('📧 Email:', director.email);
  console.log('🎭 Rol:', director.rol);
  console.log('🏢 Organization ID:', director.organizationId);
  console.log('🏢 Organization:', director.Organization?.name || 'SIN ORGANIZACIÓN');
  
  if (director.organizationId) {
    // Verificar datos de la organización
    const orgData = await prisma.organization.findUnique({
      where: { id: director.organizationId },
      include: {
        _count: {
          select: {
            Users: true
          }
        }
      }
    });
    
    console.log('\n📊 Datos de la organización:');
    console.log('- Nombre:', orgData?.name);
    console.log('- Total usuarios:', orgData?._count.Users);
    
    // Verificar créditos
    const credits = await prisma.schoolCredit.findMany({
      where: { organizationId: director.organizationId }
    });
    
    console.log('\n💳 Créditos:');
    console.log('- Registros de créditos:', credits.length);
    credits.forEach(c => {
      console.log(`  · ID ${c.id}: Comprados: ${c.totalPurchased}, Asignados: ${c.totalAllocated}, Disponibles: ${c.totalPurchased - c.totalAllocated}`);
    });
  } else {
    console.log('\n❌ PROBLEMA: El director NO tiene organizationId asignado');
    console.log('   Esto causará que /api/school-admin/dashboard falle');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
