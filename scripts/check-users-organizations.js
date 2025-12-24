const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsersOrganizations() {
  try {
    console.log('🔍 Verificando usuarios con organizaciones asignadas...\n');

    const usuarios = await prisma.usuario.findMany({
      where: {
        rol: {
          in: ['PARTICIPANTE', 'COORDINADOR', 'GAMECHANGER', 'SCHOOL_ADMIN']
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            brandColor: true
          }
        }
      },
      orderBy: {
        rol: 'asc'
      }
    });

    console.log(`📊 Total usuarios encontrados: ${usuarios.length}\n`);

    const conOrganizacion = usuarios.filter(u => u.organization);
    const sinOrganizacion = usuarios.filter(u => !u.organization);

    console.log(`✅ Con organización: ${conOrganizacion.length}`);
    console.log(`❌ Sin organización: ${sinOrganizacion.length}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('👥 USUARIOS CON ORGANIZACIÓN');
    console.log('═══════════════════════════════════════════════════════════\n');

    conOrganizacion.forEach(u => {
      console.log(`📌 ${u.nombre} (${u.email})`);
      console.log(`   Rol: ${u.rol}`);
      console.log(`   Organización: ${u.organization.name} (ID: ${u.organization.id})`);
      console.log(`   Logo: ${u.organization.logoUrl || '❌ Sin logo'}`);
      console.log(`   Color: ${u.organization.brandColor || '❌ Sin color'}\n`);
    });

    if (sinOrganizacion.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⚠️  USUARIOS SIN ORGANIZACIÓN');
      console.log('═══════════════════════════════════════════════════════════\n');

      sinOrganizacion.forEach(u => {
        console.log(`❌ ${u.nombre} (${u.email}) - ${u.rol}`);
      });
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersOrganizations();
