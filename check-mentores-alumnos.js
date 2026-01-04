const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentores() {
  try {
    console.log('🔍 Verificando mentores y sus alumnos...\n');
    
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR'
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    for (const mentor of mentores) {
      console.log(`\n📌 ${mentor.nombre} (${mentor.email})`);
      console.log(`   ID: ${mentor.id}`);
      console.log(`   Imagen: ${mentor.imagen || 'Sin imagen'}`);
      console.log(`   Alumnos asignados: ${mentor.Usuario_Usuario_assignedMentorIdToUsuario.length}`);
      
      if (mentor.Usuario_Usuario_assignedMentorIdToUsuario.length > 0) {
        console.log('   Lista de alumnos:');
        mentor.Usuario_Usuario_assignedMentorIdToUsuario.forEach(alumno => {
          console.log(`     - ${alumno.nombre} (${alumno.email})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentores();
