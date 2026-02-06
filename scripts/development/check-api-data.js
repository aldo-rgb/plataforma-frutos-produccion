// Script para simular el API y ver qué datos se devuelven
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApiResponse() {
  console.log('Iniciando...');
  try {
    // Obtener pre-registros (como hace el API para crossedParticipants)
    console.log('Buscando crossingSession...');
    const crossingSession = await prisma.crossingSession.findFirst({
      where: { },
      include: {
        PreRegistration: {
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                profileImage: true,
                gender: true,
                goals: true
              }
            }
          }
        }
      }
    });

    if (crossingSession) {
      console.log('=== Pre-Registrations (crossedParticipants) ===');
      crossingSession.PreRegistration.forEach(p => {
        console.log(`ID: ${p.userId}`);
        console.log(`   nombre: ${p.user.nombre}`);
        console.log(`   profileImage: ${p.user.profileImage ? 'SÍ (' + p.user.profileImage.substring(0, 50) + '...)' : 'NO'}`);
      });
    }

    // Obtener checkins
    const checkins = await prisma.crossingCheckin.findMany({
      where: { sessionId: 1 },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            profileImage: true
          }
        }
      }
    });

    console.log('\n=== Checkins (waitingParticipants) ===');
    checkins.forEach(c => {
      console.log(`ID: ${c.userId}`);
      console.log(`   nombre: ${c.Usuario.nombre}`);
      console.log(`   profileImage: ${c.Usuario.profileImage ? 'SÍ (' + c.Usuario.profileImage.substring(0, 50) + '...)' : 'NO'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiResponse();
