/**
 * Script para asignar licencias administrativas a coordinadores existentes
 * que no tienen licencia asignada.
 * 
 * Estas licencias NO consumen créditos de la organización.
 */

const { PrismaClient, Rol } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCoordinadoresLicencias() {
  try {
    console.log('🔍 Buscando coordinadores sin licencia...\n');

    // Buscar coordinadores sin licencia
    const coordinadores = await prisma.usuario.findMany({
      where: {
        rol: Rol.COORDINADOR,
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

    console.log(`📊 Total de coordinadores activos: ${coordinadores.length}\n`);

    let sinLicencia = 0;
    let actualizados = 0;

    for (const coord of coordinadores) {
      const tieneLicencia = coord.licenseCode || coord.LicenseAssignments.length > 0;
      
      if (!tieneLicencia) {
        sinLicencia++;
        console.log(`❌ Coordinador sin licencia:`);
        console.log(`   ID: ${coord.id}`);
        console.log(`   Nombre: ${coord.nombre}`);
        console.log(`   Email: ${coord.email}`);
        console.log(`   Organización: ${coord.organizationId}`);

        // Buscar un school admin de la misma organización para usar como assignedBy
        const directorOAdmin = await prisma.usuario.findFirst({
          where: {
            organizationId: coord.organizationId,
            rol: Rol.SCHOOL_ADMIN,
            isActive: true
          },
          select: {
            id: true
          }
        });

        if (!directorOAdmin) {
          console.log(`   ⚠️  No se encontró director/admin en la organización, usando coordinador mismo`);
        }

        // Generar código de licencia administrativa
        const adminLicenseCode = `COORD-ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        try {
          // Crear licencia administrativa
          await prisma.licenseAssignment.create({
            data: {
              userId: coord.id,
              licenseCode: adminLicenseCode,
              isActive: true,
              organizationId: coord.organizationId,
              assignedBy: directorOAdmin ? directorOAdmin.id : coord.id, // Usar director o el mismo coordinador
              assignedAt: new Date(),
              // No tiene visionId porque es administrativa
            }
          });

          actualizados++;
          console.log(`   ✅ Licencia asignada: ${adminLicenseCode}\n`);
        } catch (error) {
          console.error(`   ❌ Error asignando licencia: ${error.message}\n`);
        }
      } else {
        console.log(`✅ Coordinador ${coord.nombre} ya tiene licencia`);
        if (coord.licenseCode) {
          console.log(`   - licenseCode: ${coord.licenseCode}`);
        }
        if (coord.LicenseAssignments.length > 0) {
          console.log(`   - LicenseAssignments: ${coord.LicenseAssignments.length} activas`);
          coord.LicenseAssignments.forEach(la => {
            console.log(`     * ${la.licenseCode}`);
          });
        }
        console.log('');
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`Total coordinadores: ${coordinadores.length}`);
    console.log(`Sin licencia: ${sinLicencia}`);
    console.log(`Actualizados: ${actualizados}`);
    console.log(`Con licencia existente: ${coordinadores.length - sinLicencia}`);

    if (actualizados > 0) {
      console.log('\n✅ Proceso completado. Los coordinadores ahora pueden asignar mentores.');
    } else if (sinLicencia === 0) {
      console.log('\n✅ Todos los coordinadores ya tienen licencia asignada.');
    }

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
fixCoordinadoresLicencias();
