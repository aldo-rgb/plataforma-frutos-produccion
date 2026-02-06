const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrganizationsStructure() {
  try {
    console.log('🔍 Verificando estructura de organizaciones...\n');

    // Obtener todas las organizaciones
    const allOrgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        masterOrganizationId: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log('📊 TODAS LAS ORGANIZACIONES:');
    console.log('═══════════════════════════════════════════════════\n');
    
    allOrgs.forEach(org => {
      const type = org.masterOrganizationId ? '🏢 HIJA' : '👑 MASTER';
      console.log(`${type} ID: ${org.id} - ${org.name}`);
      console.log(`   Slug: ${org.slug || 'N/A'}`);
      if (org.masterOrganizationId) {
        console.log(`   Master Organization ID: ${org.masterOrganizationId}`);
      }
      console.log('');
    });

    // Buscar organizaciones master
    const masters = allOrgs.filter(o => !o.masterOrganizationId);
    
    console.log('\n👑 ORGANIZACIONES MASTER:');
    console.log('═══════════════════════════════════════════════════\n');
    
    for (const master of masters) {
      console.log(`${master.name} (ID: ${master.id})`);
      
      // Buscar sus hijas
      const children = await prisma.organization.findMany({
        where: {
          masterOrganizationId: master.id
        },
        select: {
          id: true,
          name: true,
          slug: true
        }
      });

      if (children.length > 0) {
        console.log(`   Tiene ${children.length} sedes:`);
        children.forEach(child => {
          console.log(`   - ${child.name} (ID: ${child.id}, Slug: ${child.slug || 'N/A'})`);
        });
      } else {
        console.log('   ⚠️ NO TIENE SEDES ASOCIADAS');
      }
      console.log('');
    }

    // Buscar organizaciones huérfanas (hijas sin master)
    console.log('\n🔍 VERIFICACIÓN DE INTEGRIDAD:');
    console.log('═══════════════════════════════════════════════════\n');
    
    const children = allOrgs.filter(o => o.masterOrganizationId);
    for (const child of children) {
      const master = await prisma.organization.findUnique({
        where: { id: child.masterOrganizationId }
      });

      if (!master) {
        console.log(`❌ PROBLEMA: ${child.name} (ID: ${child.id})`);
        console.log(`   Tiene masterOrganizationId: ${child.masterOrganizationId}`);
        console.log(`   Pero esa organización NO EXISTE\n`);
      } else {
        console.log(`✅ ${child.name} → Master: ${master.name}`);
      }
    }

    console.log('\n📋 RESUMEN:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total organizaciones: ${allOrgs.length}`);
    console.log(`Organizaciones MASTER: ${masters.length}`);
    console.log(`Organizaciones HIJAS: ${children.length}`);
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrganizationsStructure();
