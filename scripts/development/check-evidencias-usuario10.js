const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvidenciasUsuario10() {
  try {
    console.log('🔍 Buscando Usuario 10...\n');

    // Buscar Usuario 10
    const usuario10 = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nombre: { contains: 'Usuario 10', mode: 'insensitive' } },
          { email: 'usuario10@frutos.com' }
        ]
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        mentorId: true,
        assignedMentorId: true
      }
    });

    if (!usuario10) {
      console.log('❌ Usuario 10 no encontrado');
      return;
    }

    console.log('✅ Usuario 10 encontrado:');
    console.log('   ID:', usuario10.id);
    console.log('   Nombre:', usuario10.nombre);
    console.log('   Email:', usuario10.email);
    console.log('   mentorId:', usuario10.mentorId);
    console.log('   assignedMentorId:', usuario10.assignedMentorId);

    // Buscar Mentor 5
    const mentor5 = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nombre: { contains: 'mentor 5', mode: 'insensitive' } },
          { email: 'mentor5@frutos.com' }
        ]
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    console.log('\n🎓 Mentor 5:');
    if (mentor5) {
      console.log('   ID:', mentor5.id);
      console.log('   Nombre:', mentor5.nombre);
      console.log('   Email:', mentor5.email);
      console.log('   Rol:', mentor5.rol);
    } else {
      console.log('   ❌ No encontrado');
    }

    // Verificar relación
    console.log('\n🔗 Verificación de relación:');
    if (usuario10.mentorId === mentor5?.id) {
      console.log('   ✅ Usuario 10.mentorId coincide con Mentor 5');
    } else {
      console.log('   ❌ Usuario 10.mentorId NO coincide con Mentor 5');
      console.log('      Usuario 10.mentorId:', usuario10.mentorId);
      console.log('      Mentor 5.id:', mentor5?.id);
    }

    if (usuario10.assignedMentorId === mentor5?.id) {
      console.log('   ✅ Usuario 10.assignedMentorId coincide con Mentor 5');
    } else {
      console.log('   ❌ Usuario 10.assignedMentorId NO coincide con Mentor 5');
      console.log('      Usuario 10.assignedMentorId:', usuario10.assignedMentorId);
      console.log('      Mentor 5.id:', mentor5?.id);
    }

    // Buscar evidencias PENDIENTES del Usuario 10
    console.log('\n📋 Evidencias PENDIENTES de Usuario 10:\n');

    const evidenciasCarta = await prisma.evidenciaAccion.findMany({
      where: {
        usuarioId: usuario10.id,
        estado: 'PENDIENTE'
      },
      include: {
        Accion: {
          select: {
            texto: true
          }
        },
        Meta: {
          select: {
            categoria: true
          }
        }
      },
      orderBy: {
        fechaSubida: 'desc'
      }
    });

    console.log(`📊 Evidencias de CARTA PENDIENTES: ${evidenciasCarta.length}`);
    evidenciasCarta.forEach((ev, index) => {
      console.log(`\n  Evidencia ${index + 1}:`);
      console.log('    ID:', ev.id);
      console.log('    Acción:', ev.Accion?.texto);
      console.log('    Área:', ev.Meta?.categoria);
      console.log('    Estado:', ev.estado);
      console.log('    Fecha subida:', ev.fechaSubida);
    });

    // Buscar evidencias EXTRAORDINARIAS
    const evidenciasExtraordinarias = await prisma.taskSubmission.findMany({
      where: {
        usuarioId: usuario10.id,
        status: 'SUBMITTED',
        evidenciaUrl: {
          not: null
        }
      },
      include: {
        AdminTask: {
          select: {
            titulo: true,
            type: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    console.log(`\n📊 Evidencias EXTRAORDINARIAS SUBMITTED: ${evidenciasExtraordinarias.length}`);
    evidenciasExtraordinarias.forEach((ev, index) => {
      console.log(`\n  Evidencia ${index + 1}:`);
      console.log('    ID:', ev.id);
      console.log('    Título:', ev.AdminTask?.titulo);
      console.log('    Tipo:', ev.AdminTask?.type);
      console.log('    Status:', ev.status);
      console.log('    Fecha:', ev.submittedAt);
    });

    console.log('\n\n🔍 ANÁLISIS DE FILTRO DEL ENDPOINT:');
    console.log('El endpoint /api/mentor/validacion-evidencias filtra por:');
    console.log('  - estado: PENDIENTE (carta)');
    console.log('  - status: SUBMITTED (extraordinarias)');
    console.log('  - Usuario.mentorId = Mentor.id');
    console.log('\n¿Usuario 10 debería aparecer?');
    if (usuario10.mentorId === mentor5?.id || usuario10.assignedMentorId === mentor5?.id) {
      console.log('  ✅ SÍ - Usuario 10 tiene mentor asignado correctamente');
    } else {
      console.log('  ❌ NO - Usuario 10 NO tiene a Mentor 5 asignado');
      console.log(`     Necesita: mentorId = ${mentor5?.id} o assignedMentorId = ${mentor5?.id}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvidenciasUsuario10();
