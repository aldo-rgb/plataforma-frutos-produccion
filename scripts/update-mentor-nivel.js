const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateMentorNivel() {
  try {
    console.log('🔄 Actualizando nivel de mentor a JUNIOR...\n');

    const result = await prisma.perfilMentor.updateMany({
      where: {
        nivel: 'SENIOR'
      },
      data: {
        nivel: 'JUNIOR'
      }
    });

    console.log(`✅ ${result.count} perfil(es) actualizado(s) a JUNIOR\n`);

    // Verificar
    const mentores = await prisma.perfilMentor.findMany({
      include: {
        usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    console.log('📋 Estado actual de mentores:\n');
    mentores.forEach(mentor => {
      console.log(`- ${mentor.usuario.nombre} (${mentor.usuario.email}): ${mentor.nivel}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateMentorNivel();
