const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarYCrearPerfilesMentor() {
  try {
    console.log('🔍 Buscando usuarios con rol MENTOR sin perfil...\n');

    // Buscar usuarios con rol MENTOR
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR'
      },
      include: {
        PerfilMentor: true
      }
    });

    console.log(`📊 Total de usuarios MENTOR: ${mentores.length}\n`);

    let creados = 0;
    let existentes = 0;

    for (const mentor of mentores) {
      if (!mentor.PerfilMentor) {
        // Crear perfil de mentor
        await prisma.perfilMentor.create({
          data: {
            usuarioId: mentor.id,
            nivel: 'JUNIOR',
            especialidad: 'General',
            biografia: 'Perfil en construcción',
            experienciaAnios: 0,
            calificacionPromedio: 0,
            totalResenas: 0,
            disponible: false, // Inicialmente no disponible hasta que complete su perfil
            comisionMentor: 70,
            comisionPlataforma: 30
          }
        });
        
        console.log(`✅ Perfil creado para: ${mentor.nombre} (${mentor.email})`);
        creados++;
      } else {
        console.log(`ℹ️  Ya tiene perfil: ${mentor.nombre} (${mentor.email})`);
        existentes++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 RESUMEN:`);
    console.log(`   Perfiles creados: ${creados}`);
    console.log(`   Perfiles existentes: ${existentes}`);
    console.log(`   Total procesados: ${mentores.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarYCrearPerfilesMentor();
