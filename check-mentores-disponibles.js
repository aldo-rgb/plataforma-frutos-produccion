const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentores() {
  try {
    console.log('🔍 Verificando mentores en la base de datos...\n');

    // Contar todos los usuarios con rol MENTOR
    const totalMentores = await prisma.usuario.count({
      where: { rol: 'MENTOR' }
    });
    console.log(`📊 Total de usuarios con rol MENTOR: ${totalMentores}`);

    // Contar mentores activos
    const mentoresActivos = await prisma.usuario.count({
      where: { rol: 'MENTOR', isActive: true }
    });
    console.log(`✅ Mentores activos: ${mentoresActivos}`);

    // Contar perfiles de mentor
    const totalPerfiles = await prisma.perfilMentor.count();
    console.log(`📋 Total de PerfilMentor en la BD: ${totalPerfiles}\n`);

    // Obtener mentores activos con detalles
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        PerfilMentor: {
          select: {
            id: true,
            titulo: true,
            especialidad: true,
            calificacionPromedio: true,
            totalSesiones: true,
          },
        },
      },
    });

    console.log('👥 MENTORES ACTIVOS:\n');
    mentores.forEach((mentor, index) => {
      console.log(`${index + 1}. ${mentor.nombre} (${mentor.email})`);
      console.log(`   ID: ${mentor.id}`);
      if (mentor.PerfilMentor) {
        console.log(`   ✅ Tiene PerfilMentor (ID: ${mentor.PerfilMentor.id})`);
        console.log(`   Título: ${mentor.PerfilMentor.titulo || 'Sin título'}`);
        console.log(`   Especialidad: ${mentor.PerfilMentor.especialidad || 'Sin especialidad'}`);
        console.log(`   Rating: ${mentor.PerfilMentor.calificacionPromedio || 0}`);
        console.log(`   Sesiones: ${mentor.PerfilMentor.totalSesiones || 0}`);
      } else {
        console.log(`   ❌ NO tiene PerfilMentor`);
      }
      console.log('');
    });

    // Si no hay mentores con perfil, sugerir crear uno
    const mentoresConPerfil = mentores.filter(m => m.PerfilMentor);
    if (mentoresConPerfil.length === 0) {
      console.log('⚠️ PROBLEMA: No hay mentores activos con PerfilMentor');
      console.log('💡 SOLUCIÓN: Necesitas crear un PerfilMentor para al menos un mentor');
      
      if (mentores.length > 0) {
        console.log('\n📝 Puedes usar este mentor para crear un perfil:');
        const primerMentor = mentores[0];
        console.log(`   Usuario ID: ${primerMentor.id}`);
        console.log(`   Nombre: ${primerMentor.nombre}`);
        console.log(`   Email: ${primerMentor.email}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentores();
