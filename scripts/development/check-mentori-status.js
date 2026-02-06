const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentori() {
  try {
    const email = 'mentori@frutos.com';
    
    console.log(`\n🔍 Verificando estado de ${email}...\n`);

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        PerfilMentor: {
          select: {
            id: true,
            disponible: true,
            acceptingNewClients: true,
          },
        },
        CallAvailability: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isActive: true,
            type: true,
          },
        },
      },
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 USUARIO:');
    console.log(`   Nombre: ${usuario.nombre}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Rol: ${usuario.rol}`);
    console.log(`   isActive: ${usuario.isActive}`);
    console.log('');

    if (!usuario.PerfilMentor) {
      console.log('❌ NO tiene PerfilMentor');
      return;
    }

    console.log('📋 PERFIL MENTOR:');
    console.log(`   ID: ${usuario.PerfilMentor.id}`);
    console.log(`   Disponible: ${usuario.PerfilMentor.disponible}`);
    console.log(`   AcceptingNewClients: ${usuario.PerfilMentor.acceptingNewClients}`);
    console.log('');

    const horarios = usuario.CallAvailability || [];
    const horariosActivos = horarios.filter(h => h.isActive);

    console.log('📅 HORARIOS DE LLAMADAS (CallAvailability):');
    console.log(`   Total: ${horarios.length}`);
    console.log(`   Activos: ${horariosActivos.length}`);
    console.log('');

    if (horariosActivos.length > 0) {
      console.log('✅ Horarios de llamadas configurados:');
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      horariosActivos.forEach(h => {
        console.log(`   - ${dias[h.dayOfWeek]}: ${h.startTime} - ${h.endTime} (${h.type})`);
      });
      console.log('');
    } else {
      console.log('❌ Sin horarios de llamadas activos\n');
    }

    // Verificar si pasa el filtro del API
    console.log('🔎 VERIFICACIÓN DEL FILTRO API:');
    console.log(`   ✓ rol === 'MENTOR': ${usuario.rol === 'MENTOR'}`);
    console.log(`   ✓ isActive === true: ${usuario.isActive === true}`);
    console.log(`   ✓ PerfilMentor.disponible === true: ${usuario.PerfilMentor?.disponible === true}`);
    console.log(`   ✓ PerfilMentor.acceptingNewClients === true: ${usuario.PerfilMentor?.acceptingNewClients === true}`);
    console.log(`   ✓ Tiene horarios activos: ${horariosActivos.length > 0}`);
    console.log('');

    const pasaFiltro = 
      usuario.rol === 'MENTOR' &&
      usuario.isActive === true &&
      usuario.PerfilMentor?.disponible === true &&
      usuario.PerfilMentor?.acceptingNewClients === true &&
      horariosActivos.length > 0;

    if (pasaFiltro) {
      console.log('✅ ESTE MENTOR DEBERÍA APARECER EN LA LISTA');
    } else {
      console.log('❌ ESTE MENTOR NO APARECERÁ EN LA LISTA');
      console.log('\n💡 Para que aparezca debe cumplir TODOS los requisitos de arriba');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentori();
