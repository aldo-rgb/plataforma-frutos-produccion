const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentoresHorarios() {
  try {
    console.log('🔍 Verificando mentores y sus horarios...\n');

    // Obtener todos los mentores activos
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
            disponible: true,
            acceptingNewClients: true,
            DisponibilidadSemanal: {
              select: {
                id: true,
                diaSemana: true,
                horaInicio: true,
                horaFin: true,
                activo: true,
              },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    console.log(`📊 Total de mentores activos: ${mentores.length}\n`);

    mentores.forEach((mentor) => {
      const perfil = mentor.PerfilMentor;
      const horarios = perfil?.DisponibilidadSemanal || [];
      const horariosActivos = horarios.filter(h => h.activo);

      console.log(`👤 ${mentor.nombre} (${mentor.email})`);
      console.log(`   ID Usuario: ${mentor.id}`);
      console.log(`   Perfil ID: ${perfil?.id || 'N/A'}`);
      console.log(`   Disponible: ${perfil?.disponible || false}`);
      console.log(`   Accepting Clients: ${perfil?.acceptingNewClients || false}`);
      console.log(`   Total Horarios: ${horarios.length}`);
      console.log(`   Horarios Activos: ${horariosActivos.length}`);
      
      if (horariosActivos.length > 0) {
        console.log(`   ✅ Horarios configurados:`);
        horariosActivos.forEach(h => {
          const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          console.log(`      - ${dias[h.diaSemana]}: ${h.horaInicio} - ${h.horaFin}`);
        });
      } else {
        console.log(`   ❌ Sin horarios activos`);
      }
      console.log('');
    });

    // Verificar la query del API
    console.log('\n🔎 Verificando query del API (mentores que cumplan todos los filtros):\n');
    
    const mentoresFiltrados = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        PerfilMentor: {
          disponible: true,
          acceptingNewClients: true,
          DisponibilidadSemanal: {
            some: {
              activo: true,
            },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
    });

    console.log(`✅ Mentores que pasan el filtro del API: ${mentoresFiltrados.length}`);
    mentoresFiltrados.forEach(m => {
      console.log(`   - ${m.nombre} (${m.email})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentoresHorarios();
