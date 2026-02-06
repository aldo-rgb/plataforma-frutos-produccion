const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFullEndpoint() {
  try {
    const email = 'cordi@wer.com';
    const visionId = 10;

    console.log('\n🔍 SIMULANDO ENDPOINT GET /api/coordinador/visiones/10');
    console.log('===========================================================\n');

    // Paso 1: Verificar sesión
    console.log('1️⃣ Obteniendo usuario por email...');
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${usuario.nombre} (ID: ${usuario.id})`);
    console.log(`   Rol: ${usuario.rol}`);

    if (usuario.rol !== 'COORDINADOR') {
      console.log('❌ Usuario no es COORDINADOR');
      return;
    }

    // Paso 2: Obtener la visión
    console.log('\n2️⃣ Obteniendo visión...');
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

    console.log(`✅ Visión encontrada: ${vision.nombre}`);
    console.log(`   Coordinador ID: ${vision.coordinadorId}`);
    console.log(`   Usuario ID: ${usuario.id}`);
    console.log(`   ¿Match?: ${vision.coordinadorId === usuario.id}`);

    // Paso 3: Verificar permisos
    if (vision.coordinadorId !== usuario.id) {
      console.log('❌ No tiene acceso a esta visión');
      return;
    }

    console.log('✅ Acceso permitido');

    // Paso 4: Obtener participantes
    console.log('\n3️⃣ Obteniendo participantes...');
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            CartaFrutos: {
              select: {
                id: true,
                estado: true,
              },
            },
            LicenseAssignments: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
        Usuario_VisionParticipante_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`✅ Participantes encontrados: ${participantes.length}`);

    // Paso 5: Obtener game changers
    console.log('\n4️⃣ Obteniendo game changers...');
    const gameChangers = await prisma.visionGameChanger.findMany({
      where: { visionId },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            LicenseAssignments: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`✅ GameChangers encontrados: ${gameChangers.length}`);

    console.log('\n✅ ENDPOINT SIMULADO EXITOSAMENTE');
    console.log('===================================');
    console.log('Response:', JSON.stringify({
      success: true,
      vision: {
        id: vision.id,
        nombre: vision.nombre,
        coordinadorId: vision.coordinadorId,
        _count: vision._count
      },
      participantes: participantes.length,
      gameChangers: gameChangers.length
    }, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR EN EL ENDPOINT:');
    console.error('========================');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensaje:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFullEndpoint();
