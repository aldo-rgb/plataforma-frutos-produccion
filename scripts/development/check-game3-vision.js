const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGame3Vision() {
  try {
    console.log('🔍 Buscando usuario game3@quanter.com...\n');
    
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'game3@quanter.com' },
      include: {
        Organization: true
      }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('   ID:', usuario.id);
    console.log('   Nombre:', usuario.nombre);
    console.log('   Email:', usuario.email);
    console.log('   Rol:', usuario.rol);
    console.log('   Organization ID:', usuario.organizationId);
    console.log('   Organization:', usuario.Organization?.nombre || 'N/A');
    console.log('\n---\n');

    // Buscar en VisionParticipante
    console.log('📋 Buscando en VisionParticipante...\n');
    const participaciones = await prisma.visionParticipante.findMany({
      where: { participanteId: usuario.id },
      include: {
        Vision: true,
        GameChanger: { select: { nombre: true, email: true } },
        AsignadoPor: { select: { nombre: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (participaciones.length === 0) {
      console.log('⚠️ No se encontraron participaciones en visiones');
    } else {
      console.log(`✅ Encontradas ${participaciones.length} participaciones:\n`);
      participaciones.forEach((p, i) => {
        console.log(`${i + 1}. Visión: ${p.Vision.nombre}`);
        console.log(`   ID Visión: ${p.Vision.id}`);
        console.log(`   Estado: ${p.Vision.estado}`);
        console.log(`   GameChanger: ${p.GameChanger?.nombre || 'N/A'} (${p.GameChanger?.email || 'N/A'})`);
        console.log(`   Asignado por: ${p.AsignadoPor?.nombre || 'N/A'} (${p.AsignadoPor?.email || 'N/A'})`);
        console.log(`   Fecha: ${p.createdAt}`);
        console.log('');
      });
    }

    console.log('---\n');

    // Buscar todas las visiones de Quanter
    console.log('🔎 Buscando todas las visiones de Quanter...\n');
    const visionesQuanter = await prisma.vision.findMany({
      where: {
        OR: [
          { nombre: { contains: 'Quanter', mode: 'insensitive' } },
          { nombre: { contains: 'quanter', mode: 'insensitive' } },
          { organizationId: usuario.organizationId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (visionesQuanter.length === 0) {
      console.log('⚠️ No se encontraron visiones de Quanter');
    } else {
      console.log(`✅ Encontradas ${visionesQuanter.length} visiones:\n`);
      visionesQuanter.forEach((v, i) => {
        console.log(`${i + 1}. ${v.nombre}`);
        console.log(`   ID: ${v.id}`);
        console.log(`   Estado: ${v.estado}`);
        console.log(`   Organization ID: ${v.organizationId}`);
        console.log(`   Fecha creación: ${v.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame3Vision();
