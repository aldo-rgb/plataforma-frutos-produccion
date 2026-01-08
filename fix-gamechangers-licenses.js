const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGameChangerLicenses() {
  try {
    console.log('🔍 Buscando Game Changers sin licencia...\n');

    // Buscar todos los Game Changers
    const gameChangers = await prisma.usuario.findMany({
      where: {
        rol: 'GAMECHANGER'
      },
      include: {
        LicenseAssignment_LicenseAssignment_userIdToUsuario: true,
        Organization_Usuario_organizationIdToOrganization: true,
        VisionGameChanger_VisionGameChanger_gameChangerIdToUsuario: {
          include: {
            Vision: true
          }
        }
      }
    });

    console.log(`📊 Total Game Changers encontrados: ${gameChangers.length}\n`);

    let fixed = 0;
    let alreadyHasLicense = 0;

    for (const gc of gameChangers) {
      const hasLicense = gc.LicenseAssignment_LicenseAssignment_userIdToUsuario && gc.LicenseAssignment_LicenseAssignment_userIdToUsuario.length > 0;
      
      console.log(`\n👤 Game Changer: ${gc.nombre} (${gc.email})`);
      console.log(`   ID: ${gc.id}`);
      console.log(`   Organization: ${gc.Organization_Usuario_organizationIdToOrganization?.name || 'N/A'}`);
      console.log(`   Tiene licencia: ${hasLicense ? '✅ SÍ' : '❌ NO'}`);

      if (!hasLicense) {
        // Buscar la visión a la que está asignado
        const visionAssignment = gc.VisionGameChanger_VisionGameChanger_gameChangerIdToUsuario[0];
        
        if (!visionAssignment) {
          console.log(`   ⚠️  No está asignado a ninguna visión - SALTANDO`);
          continue;
        }

        console.log(`   Visión asignada: ${visionAssignment.Vision.name}`);

        // Verificar créditos disponibles
        const schoolCredit = await prisma.schoolCredit.findFirst({
          where: {
            organizationId: gc.organizationId,
            isActive: true
          }
        });

        if (!schoolCredit) {
          console.log(`   ❌ No hay SchoolCredit configurado para esta organización`);
          continue;
        }

        const available = (schoolCredit.totalPurchased || 0) - (schoolCredit.totalAllocated || 0);
        console.log(`   Créditos disponibles: ${available}`);

        if (available < 1) {
          console.log(`   ❌ Créditos insuficientes`);
          continue;
        }

        // Crear licencia
        const license = await prisma.licenseAssignment.create({
          data: {
            userId: gc.id,
            organizationId: gc.organizationId,
            assignedBy: 1, // Asumiendo admin con ID 1
            assignedAt: new Date(),
            licenseCode: `QNT-GC-STD-FIX-${gc.id}-${Date.now()}`,
            isActive: true,
            activatedAt: new Date(),
            notes: 'Licencia STANDARD creada retroactivamente - Fix para Game Changers sin licencia'
          }
        });

        // Consumir crédito
        await prisma.schoolCredit.updateMany({
          where: {
            organizationId: gc.organizationId,
            isActive: true
          },
          data: {
            totalAllocated: { increment: 1 }
          }
        });

        // Actualizar tier del usuario
        await prisma.usuario.update({
          where: { id: gc.id },
          data: { tier: 'STANDARD' }
        });

        console.log(`   ✅ LICENCIA CREADA: ${license.licenseCode}`);
        console.log(`   ✅ CRÉDITO CONSUMIDO`);
        console.log(`   ✅ TIER ACTUALIZADO A STANDARD`);
        fixed++;

      } else {
        console.log(`   ℹ️  Ya tiene licencia activa`);
        alreadyHasLicense++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📈 RESUMEN:`);
    console.log(`   Total Game Changers: ${gameChangers.length}`);
    console.log(`   Ya tenían licencia: ${alreadyHasLicense}`);
    console.log(`   Licencias creadas: ${fixed}`);
    console.log('\n✨ Proceso completado\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGameChangerLicenses();
