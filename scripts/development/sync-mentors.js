const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncMentorsFromVisions() {
  console.log('🔄 Sincronizando mentores de visiones a usuarios...\n');

  try {
    // Obtener todas las visiones con sus mentores, participantes y game changers
    const visiones = await prisma.vision.findMany({
      include: {
        Mentores: {
          include: {
            Mentor: {
              select: { id: true, nombre: true }
            }
          }
        },
        Participantes: {
          include: {
            Participante: {
              select: { id: true, nombre: true, mentorId: true }
            }
          }
        },
        GameChangers: {
          include: {
            GameChanger: {
              select: { id: true, nombre: true, mentorId: true }
            }
          }
        }
      }
    });

    let totalActualizados = 0;

    for (const vision of visiones) {
      if (vision.Mentores.length === 0) {
        console.log(`⚠️  Visión "${vision.nombre}" no tiene mentores asignados`);
        continue;
      }

      // Tomar el primer mentor de la visión
      const mentorId = vision.Mentores[0].mentorId;
      const mentorNombre = vision.Mentores[0].Mentor.nombre;

      console.log(`\n📋 Procesando visión: ${vision.nombre}`);
      console.log(`   Mentor: ${mentorNombre} (ID: ${mentorId})`);

      // Actualizar participantes que no tienen mentor
      const participantesSinMentor = vision.Participantes.filter(
        p => p.Participante.mentorId === null
      );

      // Actualizar game changers que no tienen mentor
      const gameChangersSinMentor = vision.GameChangers.filter(
        gc => gc.GameChanger.mentorId === null
      );

      const totalSinMentor = participantesSinMentor.length + gameChangersSinMentor.length;

      if (totalSinMentor === 0) {
        console.log(`   ✅ Todos los participantes y game changers ya tienen mentor asignado`);
        continue;
      }

      const usuariosIds = [
        ...participantesSinMentor.map(p => p.participanteId),
        ...gameChangersSinMentor.map(gc => gc.gameChangerId)
      ];

      const result = await prisma.usuario.updateMany({
        where: {
          id: { in: usuariosIds }
        },
        data: {
          mentorId: mentorId
        }
      });

      totalActualizados += result.count;

      console.log(`   ✅ Actualizados ${result.count} usuarios:`);
      
      if (participantesSinMentor.length > 0) {
        console.log(`      Participantes:`);
        participantesSinMentor.forEach(p => {
          console.log(`      - ${p.Participante.nombre}`);
        });
      }
      
      if (gameChangersSinMentor.length > 0) {
        console.log(`      Game Changers:`);
        gameChangersSinMentor.forEach(gc => {
          console.log(`      - ${gc.GameChanger.nombre}`);
        });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Sincronización completada`);
    console.log(`   Total usuarios actualizados: ${totalActualizados}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncMentorsFromVisions();
