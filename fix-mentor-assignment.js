const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMentorAssignment() {
  try {
    // Encontrar la última orden completada
    const orden = await prisma.ordenLoboSolitario.findFirst({
      where: { estado: 'COMPLETADO' },
      orderBy: { createdAt: 'desc' }
    });

    if (!orden) {
      console.log('❌ No hay órdenes completadas');
      return;
    }

    console.log('📦 Orden encontrada:', orden.id);
    console.log('👤 Usuario:', orden.usuarioId);
    console.log('👨‍🏫 Mentor:', orden.mentorId);

    // Actualizar usuario con mentor asignado
    await prisma.usuario.update({
      where: { id: orden.usuarioId },
      data: {
        assignedMentorId: orden.mentorId,
        tier: 'STANDARD', // Asumiendo que fue pago STANDARD
        estadoSuscripcion: 'ACTIVO'
      }
    });

    console.log('✅ Usuario actualizado con mentor asignado');

    // Crear o actualizar enrollment
    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: orden.usuarioId,
        visionId: orden.visionId
      }
    });

    if (existingEnrollment) {
      await prisma.programEnrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          mentorId: orden.mentorId,
          status: 'ACTIVE'
        }
      });
      console.log('✅ Enrollment actualizado');
    } else {
      await prisma.programEnrollment.create({
        data: {
          userId: orden.usuarioId,
          visionId: orden.visionId,
          mentorId: orden.mentorId,
          status: 'ACTIVE',
          cycleType: 'LOBO_SOLITARIO',
          totalWeeks: 9
        }
      });
      console.log('✅ Enrollment creado');
    }

    console.log('\n✨ Corrección completada. Recarga la página.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMentorAssignment();
