/**
 * Script para asignar licencias estándar a líderes existentes
 * que no tienen licencia asignada.
 * 
 * Estas licencias SÍ consumen créditos de la organización.
 */

const { PrismaClient, Rol } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLideresLicencias() {
  try {
    console.log('🔍 Buscando líderes sin licencia...\n');

    // Buscar líderes sin licencia
    const lideres = await prisma.usuario.findMany({
      where: {
        rol: Rol.LIDER,
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

    console.log(`📊 Total de líderes activos: ${lideres.length}\n`);

    let sinLicencia = 0;
    let actualizados = 0;

    for (const lider of lideres) {
      const tieneLicencia = lider.licenseCode || lider.LicenseAssignments.length > 0;
      
      if (!tieneLicencia) {
        sinLicencia++;
        console.log(`❌ Líder sin licencia:`);
        console.log(`   ID: ${lider.id}`);
        console.log(`   Nombre: ${lider.nombre}`);
        console.log(`   Email: ${lider.email}`);
        console.log(`   Organización: ${lider.organizationId}`);

        // Buscar un school admin de la misma organización para usar como assignedBy
        const schoolAdmin = await prisma.usuario.findFirst({
          where: {
            organizationId: lider.organizationId,
            rol: Rol.SCHOOL_ADMIN,
            isActive: true
          },
          select: {
            id: true
          }
        });

        if (!schoolAdmin) {
          console.log(`   ⚠️  No se encontró school admin en la organización, usando líder mismo`);
        }

        // Generar código de licencia estándar
        const standardLicenseCode = `QNT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        try {
          // Crear licencia estándar (consume créditos)
          await prisma.licenseAssignment.create({
            data: {
              userId: lider.id,
              licenseCode: standardLicenseCode,
              isActive: true,
              organizationId: lider.organizationId,
              assignedBy: schoolAdmin ? schoolAdmin.id : lider.id, // Usar school admin o el mismo líder
              assignedAt: new Date(),
              // No tiene visionId al momento de creación
            }
          });

          actualizados++;
          console.log(`   ✅ Licencia estándar asignada: ${standardLicenseCode}`);
          console.log(`   ⚠️  Esta licencia CONSUME 1 crédito de la organización\n`);
        } catch (error) {
          console.error(`   ❌ Error asignando licencia: ${error.message}\n`);
        }
      } else {
        console.log(`✅ Líder con licencia:`);
        console.log(`   ID: ${lider.id}`);
        console.log(`   Nombre: ${lider.nombre}`);
        console.log(`   Email: ${lider.email}`);
        if (lider.licenseCode) {
          console.log(`   LicenseCode (campo legacy): ${lider.licenseCode}`);
        }
        if (lider.LicenseAssignments.length > 0) {
          console.log(`   LicenseAssignments: ${lider.LicenseAssignments.map(la => la.licenseCode).join(', ')}`);
        }
        console.log('');
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`Total líderes: ${lideres.length}`);
    console.log(`Sin licencia: ${sinLicencia}`);
    console.log(`Actualizados: ${actualizados}`);
    console.log(`Con licencia existente: ${lideres.length - sinLicencia}`);

    console.log('\n✅ Proceso completado.');
    console.log('⚠️  IMPORTANTE: Las licencias asignadas a líderes CONSUMEN créditos de la organización.');

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLideresLicencias();
