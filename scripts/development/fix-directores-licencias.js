const { PrismaClient, Rol } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Buscando directores (SCHOOL_ADMIN) sin licencia...\n');

    // Buscar todos los directores activos
    const directores = await prisma.usuario.findMany({
      where: {
        rol: Rol.SCHOOL_ADMIN,
        isActive: true
      },
      include: {
        LicenseAssignments: {
          where: {
            isActive: true
          }
        }
      }
    });

    console.log(`📊 Total de directores activos: ${directores.length}\n`);

    let sinLicencia = 0;
    let actualizados = 0;
    let conLicenciaExistente = 0;

    for (const director of directores) {
      // Verificar si tiene licencia (en cualquiera de los dos campos)
      const tieneLicencia = director.licenseCode || director.LicenseAssignments.length > 0;

      if (tieneLicencia) {
        console.log(`✅ Director con licencia:`);
        console.log(`   ID: ${director.id}`);
        console.log(`   Nombre: ${director.nombre}`);
        console.log(`   Email: ${director.email}`);
        if (director.LicenseAssignments.length > 0) {
          console.log(`   LicenseAssignments: ${director.LicenseAssignments.map(l => l.licenseCode).join(', ')}`);
        } else {
          console.log(`   licenseCode: ${director.licenseCode}`);
        }
        console.log('');
        conLicenciaExistente++;
        continue;
      }

      // Director sin licencia - asignar licencia administrativa
      sinLicencia++;
      
      // Generar código de licencia administrativa
      const adminLicenseCode = `DIRECTOR-ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Buscar un administrador del sistema para asignar como assignedBy
      // o usar el propio director como fallback
      const adminUser = await prisma.usuario.findFirst({
        where: { rol: Rol.ADMINISTRADOR }
      });

      const assignedBy = adminUser ? adminUser.id : director.id;

      console.log(`📝 Asignando licencia administrativa a director:`);
      console.log(`   ID: ${director.id}`);
      console.log(`   Nombre: ${director.nombre}`);
      console.log(`   Email: ${director.email}`);
      console.log(`   Código: ${adminLicenseCode}`);
      console.log(`   Organization ID: ${director.organizationId || 'N/A'}`);

      try {
        // Crear la asignación de licencia administrativa
        await prisma.licenseAssignment.create({
          data: {
            userId: director.id,
            licenseCode: adminLicenseCode,
            isActive: true,
            organizationId: director.organizationId,
            assignedBy: assignedBy,
            assignedAt: new Date(),
            // No tiene visionId porque es licencia administrativa
          }
        });

        console.log(`   ✅ Licencia asignada exitosamente\n`);
        actualizados++;
      } catch (error) {
        console.error(`   ❌ Error asignando licencia:`, error.message);
        console.log('');
      }
    }

    // Resumen
    console.log('\n📊 Resumen:');
    console.log(`Total directores: ${directores.length}`);
    console.log(`Sin licencia: ${sinLicencia}`);
    console.log(`Actualizados: ${actualizados}`);
    console.log(`Con licencia existente: ${conLicenciaExistente}`);
    
    console.log('\n✅ Proceso completado.');
    console.log('⚠️  IMPORTANTE: Las licencias administrativas asignadas a directores NO CONSUMEN créditos de la organización.');

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
