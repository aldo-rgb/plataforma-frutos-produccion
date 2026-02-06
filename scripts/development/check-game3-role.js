const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGame3Role() {
  try {
    console.log('🔍 Verificando rol de game3@quanter.com...\n');
    
    const user = await prisma.usuario.findUnique({
      where: { email: 'game3@quanter.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        organizationId: true
      }
    });

    console.log('👤 Usuario:');
    console.log('   Nombre:', user.nombre);
    console.log('   Email:', user.email);
    console.log('   ROL:', user.rol);
    console.log('   Org ID:', user.organizationId);
    console.log('');

    // Verificar todas las relaciones con visiones
    console.log('📋 Relaciones con visiones:\n');

    // Como Participante
    const asParticipante = await prisma.visionParticipante.findMany({
      where: { participanteId: user.id },
      include: { Vision: { select: { nombre: true } } }
    });
    console.log('Como Participante:', asParticipante.length);
    asParticipante.forEach(p => console.log('  -', p.Vision.nombre));

    // Como GameChanger
    const asGameChanger = await prisma.visionGameChanger.findMany({
      where: { gameChangerId: user.id },
      include: { Vision: { select: { nombre: true } } }
    });
    console.log('\nComo GameChanger:', asGameChanger.length);
    asGameChanger.forEach(p => console.log('  -', p.Vision.nombre));

    // Como Mentor
    const asMentor = await prisma.visionMentor.findMany({
      where: { mentorId: user.id },
      include: { Vision: { select: { nombre: true } } }
    });
    console.log('\nComo Mentor:', asMentor.length);
    asMentor.forEach(p => console.log('  -', p.Vision.nombre));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame3Role();
