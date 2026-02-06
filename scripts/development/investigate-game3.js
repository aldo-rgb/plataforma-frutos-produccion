const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateGame3Creation() {
  try {
    console.log('🔍 Investigando cómo se creó game3@quanter.com...\n');
    
    // Usuario game3
    const game3 = await prisma.usuario.findUnique({
      where: { email: 'game3@quanter.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true,
        createdAt: true,
        onboardingOrigin: true
      }
    });

    if (!game3) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 Usuario game3:');
    console.log('   ID:', game3.id);
    console.log('   Organization ID:', game3.organizationId);
    console.log('   Fecha creación:', game3.createdAt);
    console.log('   Onboarding Origin:', game3.onboardingOrigin);
    console.log('\n---\n');

// Buscar en licencias asignadas
console.log('🎫 Licencias asignadas:\n');
const licencias = await prisma.licenseAssignment.findMany({
  where: { userId: game3.id },
  include: {
    Vision: {
      select: { nombre: true, organizationId: true }
    },
    Organization: {
      select: { name: true }
    },
    User: {
      select: { nombre: true, email: true, rol: true }
    }
  },
  orderBy: { assignedAt: 'asc' }
});

if (licencias.length === 0) {
      console.log('⚠️ No tiene licencias asignadas');
    } else {
      licencias.forEach((lic, i) => {
        console.log(`${i + 1}. Licencia: ${lic.licenseCode}`);
        console.log(`   Visión: ${lic.Vision?.nombre || 'N/A'} (ID: ${lic.visionId})`);
        console.log(`   Vision Org ID: ${lic.Vision?.organizationId}`);
        console.log(`   License Org ID: ${lic.organizationId}`);
        console.log(`   Organización: ${lic.Organization?.name || 'N/A'}`);
        console.log(`   Asignada por: ${lic.AssignedBy || 'N/A'}`);
        console.log(`   Usuario: ${lic.User?.nombre || 'N/A'} (${lic.User?.email || 'N/A'})`);
        console.log(`   Rol de usuario: ${lic.User?.rol || 'N/A'}`);
        console.log(`   Fecha asignación: ${lic.assignedAt}`);
        console.log('');
      });
    }

    console.log('---\n');

    // Verificar Vision prueba
    console.log('🔎 Investigando "Vision prueba":\n');
    const visionPrueba = await prisma.vision.findFirst({
      where: { nombre: 'Vision prueba' },
      include: {
        Organization: {
          select: { id: true, name: true }
        },
        Coordinador: {
          select: { id: true, nombre: true, email: true, organizationId: true }
        }
      }
    });

    if (visionPrueba) {
      console.log('Visión: Vision prueba');
      console.log('   ID:', visionPrueba.id);
      console.log('   Organization ID:', visionPrueba.organizationId);
      console.log('   Organización:', visionPrueba.Organization?.name || 'N/A');
      console.log('   Coordinador:', visionPrueba.Coordinador?.nombre || 'N/A');
      console.log('   Coordinador email:', visionPrueba.Coordinador?.email || 'N/A');
      console.log('   Coordinador Org ID:', visionPrueba.Coordinador?.organizationId);
      console.log('\n');

      if (visionPrueba.Coordinador?.email === 'coordinador@quanter.com') {
        console.log('⚠️ PROBLEMA DETECTADO:');
        console.log('   El coordinador de Quanter (Org 6) era coordinador de "Vision prueba" (Org 3)');
        console.log('   Esto permitió que creara usuarios en una visión de otra organización');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateGame3Creation();
