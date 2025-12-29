const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCoordinador() {
  try {
    console.log('🔍 Verificando coordinador@quanter.com...\n');
    
    const coordinador = await prisma.usuario.findUnique({
      where: { email: 'coordinador@quanter.com' },
      include: {
        Organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!coordinador) {
      console.log('❌ Coordinador no encontrado');
      return;
    }

    console.log('✅ Coordinador encontrado:');
    console.log('   ID:', coordinador.id);
    console.log('   Nombre:', coordinador.nombre);
    console.log('   Email:', coordinador.email);
    console.log('   Rol:', coordinador.rol);
    console.log('   Organization ID:', coordinador.organizationId);
    console.log('   Organization:', coordinador.Organization?.name || 'N/A');
    console.log('\n---\n');

    // Verificar visiones donde es coordinador
    console.log('📋 Visiones donde es coordinador:\n');
    const visionesCoord = await prisma.vision.findMany({
      where: { coordinadorId: coordinador.id },
      include: {
        Organization: {
          select: { name: true }
        }
      }
    });

    if (visionesCoord.length === 0) {
      console.log('⚠️ No es coordinador de ninguna visión');
    } else {
      visionesCoord.forEach((v, i) => {
        console.log(`${i + 1}. ${v.nombre}`);
        console.log(`   ID: ${v.id}`);
        console.log(`   Organización: ${v.Organization?.name || 'N/A'}`);
        console.log(`   Organization ID: ${v.organizationId}`);
        console.log('');
      });
    }

    console.log('---\n');

    // Verificar participaciones en visiones
    console.log('📋 Como participante en visiones:\n');
    const participaciones = await prisma.visionParticipante.findMany({
      where: { participanteId: coordinador.id },
      include: {
        Vision: {
          select: { nombre: true, organizationId: true }
        }
      }
    });

    if (participaciones.length === 0) {
      console.log('⚠️ No está como participante en ninguna visión');
    } else {
      participaciones.forEach((p, i) => {
        console.log(`${i + 1}. ${p.Vision.nombre}`);
        console.log(`   Vision ID: ${p.visionId}`);
        console.log(`   Organization ID: ${p.Vision.organizationId}`);
        console.log('');
      });
    }

    console.log('---\n');

    // Verificar organizaciones
    console.log('🏢 Organizaciones en el sistema:\n');
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    orgs.forEach(org => {
      console.log(`${org.id}. ${org.name}`);
    });

    console.log('\n---\n');

    // Verificar si debería estar en organización Quanter
    const quanterOrg = orgs.find(o => o.name === 'Quanter');
    if (quanterOrg && coordinador.organizationId !== quanterOrg.id) {
      console.log(`⚠️ PROBLEMA DETECTADO:`);
      console.log(`   El coordinador está en organización ID ${coordinador.organizationId} (${coordinador.Organization?.name})`);
      console.log(`   Pero debería estar en organización ID ${quanterOrg.id} (Quanter)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCoordinador();
