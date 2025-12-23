const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvidenciasRechazadas() {
  try {
    console.log('🔍 Buscando evidencias rechazadas...\n');

    // Buscar todas las evidencias rechazadas
    const evidenciasRechazadas = await prisma.evidenciaAccion.findMany({
      where: {
        estado: 'RECHAZADA'
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            mentorId: true
          }
        },
        Accion: {
          select: {
            texto: true
          }
        }
      },
      orderBy: {
        fechaRevision: 'desc'
      },
      take: 10
    });

    console.log(`📊 Total evidencias rechazadas: ${evidenciasRechazadas.length}\n`);

    if (evidenciasRechazadas.length > 0) {
      evidenciasRechazadas.forEach((ev, index) => {
        console.log(`--- Evidencia ${index + 1} ---`);
        console.log('ID:', ev.id);
        console.log('Usuario:', ev.Usuario.nombre, `(ID: ${ev.usuarioId})`);
        console.log('Acción:', ev.Accion.texto);
        console.log('Estado:', ev.estado);
        console.log('Comentario Mentor:', ev.comentarioMentor);
        console.log('Fecha Rechazo:', ev.fechaRevision);
        console.log('Mentor ID asignado:', ev.Usuario.mentorId);
        console.log('');
      });
    } else {
      console.log('✅ No hay evidencias rechazadas en el sistema');
    }

    // Buscar evidencias pendientes
    console.log('\n🔍 Buscando evidencias pendientes...\n');
    
    const evidenciasPendientes = await prisma.evidenciaAccion.findMany({
      where: {
        estado: 'PENDIENTE'
      },
      include: {
        Usuario: {
          select: {
            nombre: true,
            mentorId: true
          }
        }
      }
    });

    console.log(`📊 Total evidencias PENDIENTES: ${evidenciasPendientes.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvidenciasRechazadas();
