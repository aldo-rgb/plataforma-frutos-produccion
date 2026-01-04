const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCoordinadorAccess() {
  try {
    const email = 'cordi@wer.com';
    
    // Simular lo que hace el endpoint
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    console.log('\n👤 USUARIO:');
    console.log('===========');
    console.log(JSON.stringify(usuario, null, 2));

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('\n🔍 BUSCANDO VISIONES:');
    console.log('=====================');
    
    const visiones = await prisma.vision.findMany({
      where: {
        coordinadorId: usuario.id
      },
      include: {
        _count: {
          select: {
            VisionParticipante: true,
            VisionGameChanger: true
          }
        }
      }
    });

    console.log(`Visiones encontradas: ${visiones.length}`);
    console.log(JSON.stringify(visiones, null, 2));

    // Probar acceso a visión específica #10
    const visionId = 10;
    console.log(`\n🎯 PROBANDO ACCESO A VISIÓN #${visionId}:`);
    console.log('=========================================');

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        _count: {
          select: {
            VisionParticipante: true,
            VisionGameChanger: true,
            VisionMentor: true,
          },
        },
      },
    });

    if (!vision) {
      console.log('❌ Visión no encontrada');
      return;
    }

    console.log('✅ Visión encontrada:', vision.nombre);
    console.log('Coordinador ID:', vision.coordinadorId);
    console.log('Usuario ID:', usuario.id);
    console.log('¿Match?:', vision.coordinadorId === usuario.id);

    if (vision.coordinadorId !== usuario.id) {
      console.log('❌ ACCESO DENEGADO: El coordinador no coincide');
    } else {
      console.log('✅ ACCESO PERMITIDO');
      
      // Obtener más detalles
      const participantes = await prisma.visionParticipante.findMany({
        where: { visionId },
        include: {
          Usuario_VisionParticipante_participanteIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            }
          }
        }
      });

      console.log(`\n📊 Participantes: ${participantes.length}`);
      
      const gameChangers = await prisma.visionGameChanger.findMany({
        where: { visionId },
        include: {
          Usuario_VisionGameChanger_gameChangerIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            }
          }
        }
      });

      console.log(`📊 GameChangers: ${gameChangers.length}`);
    }

  } catch (error) {
    console.error('❌ ERROR:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCoordinadorAccess();
