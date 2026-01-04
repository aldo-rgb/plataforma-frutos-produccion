const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentoriStatus() {
  try {
    const mentor = await prisma.usuario.findUnique({
      where: { email: 'mentori@frutos.com' },
      include: {
        PerfilMentor: true,
        CallAvailability: {
          where: {
            isActive: true
          }
        }
      }
    });

    if (!mentor) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('\n========================================');
    console.log('👤 USUARIO: mentori@frutos.com');
    console.log('========================================');
    console.log(`ID: ${mentor.id}`);
    console.log(`Nombre: ${mentor.nombre}`);
    console.log(`Rol: ${mentor.rol}`);
    console.log(`isActive: ${mentor.isActive}`);

    if (mentor.PerfilMentor) {
      console.log('\n📋 PERFIL MENTOR:');
      console.log(`  disponible: ${mentor.PerfilMentor.disponible}`);
      console.log(`  acceptingNewClients: ${mentor.PerfilMentor.acceptingNewClients}`);
      console.log(`  destacado: ${mentor.PerfilMentor.destacado}`);
      console.log(`  precioBase: $${mentor.PerfilMentor.precioBase}`);
    } else {
      console.log('\n❌ NO TIENE PERFIL MENTOR');
    }

    console.log('\n📞 CALL AVAILABILITY (Horarios de Llamadas Activos):');
    if (mentor.CallAvailability && mentor.CallAvailability.length > 0) {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      mentor.CallAvailability.forEach(slot => {
        console.log(`  ✅ ${dias[slot.dayOfWeek]}: ${slot.startTime} - ${slot.endTime} [${slot.type}]`);
      });
      console.log(`\n  TOTAL: ${mentor.CallAvailability.length} horarios activos`);
    } else {
      console.log('  ❌ NO TIENE HORARIOS DE LLAMADAS CONFIGURADOS');
    }

    console.log('\n========================================');
    console.log('🔍 ANÁLISIS DE FILTROS:');
    console.log('========================================');
    
    const pasaFiltros = {
      'Usuario.rol === MENTOR': mentor.rol === 'MENTOR',
      'Usuario.isActive === true': mentor.isActive === true,
      'PerfilMentor existe': !!mentor.PerfilMentor,
      'PerfilMentor.disponible === true': mentor.PerfilMentor?.disponible === true,
      'PerfilMentor.acceptingNewClients === true': mentor.PerfilMentor?.acceptingNewClients === true,
      'CallAvailability con isActive=true': (mentor.CallAvailability?.length || 0) > 0
    };

    Object.entries(pasaFiltros).forEach(([filtro, pasa]) => {
      console.log(`  ${pasa ? '✅' : '❌'} ${filtro}`);
    });

    const todosLosFiltros = Object.values(pasaFiltros).every(v => v);
    console.log('\n========================================');
    if (todosLosFiltros) {
      console.log('✅ ESTE MENTOR DEBERÍA APARECER EN LA LISTA');
    } else {
      console.log('❌ ESTE MENTOR NO PASARÁ LOS FILTROS');
      console.log('\n💡 BLOQUEADORES:');
      Object.entries(pasaFiltros).forEach(([filtro, pasa]) => {
        if (!pasa) {
          console.log(`   - ${filtro}`);
        }
      });
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentoriStatus();
