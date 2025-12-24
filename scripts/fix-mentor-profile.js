/**
 * Script para crear PerfilMentor faltante
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMentorProfile() {
  try {
    console.log('🔍 Buscando mentores sin perfil...\n');
    
    // Buscar usuarios con rol MENTOR
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR'
      },
      include: {
        PerfilMentor: true
      }
    });
    
    console.log(`📊 Total mentores: ${mentores.length}`);
    
    // Filtrar mentores sin perfil
    const mentoresSinPerfil = mentores.filter(m => !m.PerfilMentor);
    
    console.log(`❌ Mentores SIN perfil: ${mentoresSinPerfil.length}\n`);
    
    if (mentoresSinPerfil.length === 0) {
      console.log('✅ Todos los mentores tienen perfil');
      return;
    }
    
    // Crear perfiles faltantes
    for (const mentor of mentoresSinPerfil) {
      console.log(`📝 Creando perfil para: ${mentor.nombre} (${mentor.email})`);
      
      await prisma.perfilMentor.create({
        data: {
          usuarioId: mentor.id,
          nivel: 'JUNIOR',
          especialidad: 'Mentoría General',
          biografia: 'Perfil en construcción',
          biografiaCompleta: 'Perfil en construcción',
          biografiaCorta: 'Mentor de alto rendimiento',
          experienciaAnios: 1,
          calificacionPromedio: 0,
          totalResenas: 0,
          disponible: true,
          comisionMentor: 70,
          comisionPlataforma: 30,
          destacado: false,
          especialidadesSecundarias: [],
          logros: [],
          titulo: 'Mentor',
          totalSesiones: 0,
          completedSessionsCount: 0,
          ratingSum: 0,
          ratingCount: 0,
          precioBase: 500,
          tagline: 'Mentor profesional',
          expertiseTags: ['Mentoría'],
          methodologyStyle: 'BALANCED',
          heroJourneyBio: 'Perfil en construcción',
          promiseStatement: 'Te ayudaré a alcanzar tus metas',
          aiGeneratedBio: false
        }
      });
      
      console.log(`   ✅ Perfil creado exitosamente\n`);
    }
    
    console.log('🎉 ¡Todos los perfiles creados!\n');
    
    // Mostrar resumen final
    const mentoresActualizados = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR'
      },
      include: {
        PerfilMentor: true
      }
    });
    
    console.log('📊 RESUMEN FINAL:');
    mentoresActualizados.forEach(m => {
      const tienePerfil = m.PerfilMentor ? '✅' : '❌';
      console.log(`   ${tienePerfil} ${m.nombre} - ${m.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMentorProfile();
