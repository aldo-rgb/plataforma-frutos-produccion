const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNivel() {
  try {
    const mentores = await prisma.perfilMentor.findMany({
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    console.log('\n📋 Estado actual de mentores:\n');
    mentores.forEach(mentor => {
      console.log(`- ${mentor.Usuario.nombre} (${mentor.Usuario.email})`);
      console.log(`  Nivel: ${mentor.nivel}`);
      console.log(`  Especialidad: ${mentor.especialidad}`);
      console.log(`  Precio Base: $${mentor.precioBase}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNivel();
