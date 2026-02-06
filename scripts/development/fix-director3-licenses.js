const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDirector3Licenses() {
  try {
    console.log('🔧 Corrigiendo licencias de director3@frutos.com...\n');
    
    // Buscar usuario y organización
    const user = await prisma.usuario.findUnique({
      where: { email: 'director3@frutos.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', user.nombre, '(ID:', user.id + ')');
    
    if (!user.organizationId) {
      console.log('❌ Usuario no tiene organización asignada');
      return;
    }
    
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });
    
    console.log('✅ Organización:', org.name);
    console.log('   Total licenses:', org.totalLicenses);
    console.log('   Active licenses:', org.activeLicenses);
    
    // Verificar cuántas licenses existen
    const existingLicenses = await prisma.license.count({
      where: { organizationId: org.id }
    });
    
    console.log('   Licenses creadas:', existingLicenses);
    
    if (existingLicenses >= org.totalLicenses) {
      console.log('\n✅ Las licencias ya están creadas correctamente');
      return;
    }
    
    // Crear las licencias faltantes
    const licensesToCreate = org.totalLicenses - existingLicenses;
    console.log(`\n📝 Creando ${licensesToCreate} licencias...`);
    
    const licensesData = [];
    for (let i = existingLicenses; i < org.totalLicenses; i++) {
      const licenseCode = `${org.slug.toUpperCase()}-${String(i + 1).padStart(4, '0')}`;
      licensesData.push({
        code: licenseCode,
        organizationId: org.id,
        isActive: true,
        tierAssigned: 'PREMIUM',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      });
    }
    
    await prisma.license.createMany({
      data: licensesData
    });
    
    console.log('✅ Licencias creadas exitosamente');
    
    // Verificar resultado final
    const totalAfter = await prisma.license.count({
      where: { organizationId: org.id }
    });
    
    console.log('\n📊 Resultado final:');
    console.log('   Licencias totales:', totalAfter);
    console.log('   Licencias disponibles:', totalAfter - org.activeLicenses);
    console.log('   Licencias activas:', org.activeLicenses);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDirector3Licenses();
