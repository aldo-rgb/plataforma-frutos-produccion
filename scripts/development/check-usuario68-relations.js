const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Buscando usuario 68...\n');
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: 68 },
      include: {
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                coordinadorId: true
              }
            }
          }
        },
        VisionGameChanger_VisionGameChanger_gameChangerIdToUsuario: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                coordinadorId: true
              }
            }
          }
        }
      }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('ID:', usuario.id);
    console.log('Nombre:', usuario.nombre);
    console.log('Email:', usuario.email);
    console.log('Rol:', usuario.rol);
    console.log('\n📋 Como Participante en Visiones:');
    console.log(JSON.stringify(usuario.VisionParticipante_VisionParticipante_participanteIdToUsuario, null, 2));
    
    console.log('\n🎮 Como GameChanger en Visiones:');
    console.log(JSON.stringify(usuario.VisionGameChanger_VisionGameChanger_gameChangerIdToUsuario, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
