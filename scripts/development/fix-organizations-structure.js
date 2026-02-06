const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrganizationsStructure() {
  try {
    console.log('🔧 Arreglando estructura de organizaciones...\n');

    // Primero necesitamos encontrar un usuario admin para asignar como schoolAdminId
    console.log('🔍 Buscando usuario admin...');
    const adminUser = await prisma.usuario.findFirst({
      where: {
        OR: [
          { rol: 'ADMINISTRADOR' },
          { rol: 'SUPER_ADMIN' },
          { rol: 'SCHOOL_ADMIN' }
        ]
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    if (!adminUser) {
      console.error('❌ No se encontró ningún usuario ADMIN, SUPER_ADMIN o SCHOOL_ADMIN');
      console.log('   Necesitas tener al menos un usuario con uno de estos roles');
      return;
    }

    console.log(`✅ Admin encontrado: ${adminUser.nombre} (${adminUser.rol}, ID: ${adminUser.id})\n`);

    // OPCIÓN 1: Crear la organización master "Impacto Cuántico" con ID 1
    console.log('📝 Creando organización MASTER "Impacto Cuántico"...');
    
    const masterOrg = await prisma.organization.create({
      data: {
        id: 1,
        name: 'Impacto Cuántico',
        slug: 'impacto-cuantico',
        contactEmail: 'contacto@impactocuantico.com',
        brandColor: '#8B5CF6',
        status: 'ACTIVE',
        isGeofenced: false,
        totalLicenses: 1000,
        activeLicenses: 0,
        totalStudents: 0,
        schoolAdminId: adminUser.id,
        updatedAt: new Date()
      }
    });

    console.log('✅ Organización MASTER creada:');
    console.log(`   ID: ${masterOrg.id}`);
    console.log(`   Nombre: ${masterOrg.name}`);
    console.log(`   Slug: ${masterOrg.slug}\n`);

    // Verificar que las organizaciones hijas ahora tienen una master válida
    console.log('🔍 Verificando organizaciones hijas...');
    
    const children = await prisma.organization.findMany({
      where: {
        masterOrganizationId: 1
      },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`✅ Encontradas ${children.length} organizaciones hijas:`);
    children.forEach(child => {
      console.log(`   - ${child.name} (ID: ${child.id})`);
    });

    console.log('\n✨ ¡Estructura arreglada exitosamente!');
    console.log('\n📋 ESTRUCTURA FINAL:');
    console.log('═══════════════════════════════════════════════════');
    console.log('👑 Impacto Cuántico (MASTER - ID: 1)');
    console.log('   ├── 🏢 Impacto Cuántico Monterrey (ID: 3)');
    console.log('   └── 🏢 Impacto Cuántico GDL (ID: 5)');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('🎯 Ahora puedes acceder con:');
    console.log('   - http://localhost:3000/auth/signup?org=1  (Master)');
    console.log('   - http://localhost:3000/auth/signup?org=3  (Monterrey)');
    console.log('   - http://localhost:3000/auth/signup?org=5  (GDL)');
    console.log('\n   Cualquiera de estas URLs mostrará las 2 sedes disponibles.\n');

  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ Error: Ya existe una organización con ID 1');
      console.error('   Ejecuta primero: node check-organizations-structure.js');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixOrganizationsStructure();
