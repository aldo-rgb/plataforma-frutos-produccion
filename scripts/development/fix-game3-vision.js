const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGame3Vision() {
  try {
    console.log('🔧 Corrigiendo visión del usuario game3@quanter.com...\n');
    
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'game3@quanter.com' }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', usuario.nombre);
    console.log('   ID:', usuario.id);
    console.log('   Organization ID:', usuario.organizationId);

    // Encontrar visión "Quanter V3"
    const quanterV3 = await prisma.vision.findFirst({
      where: { nombre: 'Quanter V3' }
    });

    if (!quanterV3) {
      console.log('❌ Visión "Quanter V3" no encontrada');
      return;
    }

    console.log('\n📍 Visión destino: Quanter V3 (ID:', quanterV3.id, ')');

    // Verificar si ya está en Quanter V3
    const yaEstaEnQuanterV3 = await prisma.visionParticipante.findFirst({
      where: {
        visionId: quanterV3.id,
        participanteId: usuario.id
      }
    });

    if (yaEstaEnQuanterV3) {
      console.log('✅ El usuario ya está en Quanter V3');
    } else {
      console.log('\n➕ Agregando usuario a Quanter V3...');
      await prisma.visionParticipante.create({
        data: {
          visionId: quanterV3.id,
          participanteId: usuario.id
        }
      });
      console.log('✅ Usuario agregado a Quanter V3');
    }

    // Eliminar de "Vision prueba"
    const visionPrueba = await prisma.vision.findFirst({
      where: { nombre: 'Vision prueba' }
    });

    if (visionPrueba) {
      console.log('\n🗑️  Eliminando de "Vision prueba"...');
      const deleted = await prisma.visionParticipante.deleteMany({
        where: {
          visionId: visionPrueba.id,
          participanteId: usuario.id
        }
      });
      console.log(`✅ Eliminado de Vision prueba (${deleted.count} registro(s))`);
    }

    // Verificar resultado final
    console.log('\n📊 Verificando resultado...');
    const visiones = await prisma.visionParticipante.findMany({
      where: { participanteId: usuario.id },
      include: {
        Vision: { select: { nombre: true } }
      }
    });

    console.log(`✅ Visiones actuales del usuario (${visiones.length}):`);
    visiones.forEach(v => {
      console.log(`   - ${v.Vision.nombre}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGame3Vision();
