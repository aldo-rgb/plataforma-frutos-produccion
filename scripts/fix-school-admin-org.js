const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchoolAdminOrganization() {
  try {
    console.log('🔍 Buscando usuarios SCHOOL_ADMIN sin organización...');
    
    // Buscar todos los SCHOOL_ADMIN
    const schoolAdmins = await prisma.usuario.findMany({
      where: { rol: 'SCHOOL_ADMIN' },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true,
      }
    });

    console.log(`📊 Encontrados ${schoolAdmins.length} usuarios SCHOOL_ADMIN`);

    for (const admin of schoolAdmins) {
      console.log(`\n👤 Usuario: ${admin.nombre} (${admin.email})`);
      console.log(`   OrganizationId actual: ${admin.organizationId || 'NULL'}`);

      if (!admin.organizationId) {
        // Buscar o crear organización para este admin
        let organization = await prisma.organization.findFirst({
          where: { 
            name: { contains: admin.nombre.split(' ')[0] }
          }
        });

        if (!organization) {
          // Crear nueva organización
          const slug = `centro-${admin.nombre.split(' ')[0].toLowerCase()}-${Date.now()}`;
          organization = await prisma.organization.create({
            data: {
              name: `Centro ${admin.nombre.split(' ')[0]}`,
              slug: slug,
              contactEmail: admin.email,
              brandColor: '#8B5CF6', // Purple
              schoolAdminId: admin.id,
            }
          });
          console.log(`   ✅ Organización creada: ${organization.name} (ID: ${organization.id})`);
        } else {
          console.log(`   📋 Organización encontrada: ${organization.name} (ID: ${organization.id})`);
        }

        // Asignar organización al usuario
        await prisma.usuario.update({
          where: { id: admin.id },
          data: { organizationId: organization.id }
        });

        console.log(`   ✅ OrganizationId asignado: ${organization.id}`);
      } else {
        console.log(`   ✅ Ya tiene organización asignada`);
      }
    }

    console.log('\n✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchoolAdminOrganization();
