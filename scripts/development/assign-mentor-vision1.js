const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignMentorToVision1() {
  try {
    // Buscar usuario
    const user = await prisma.usuario.findUnique({
      where: { email: 'vision1@frutos.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 Usuario:', user.nombre, '(ID:', user.id, ')');
    console.log('   Organization ID:', user.organizationId);
    console.log('   Subscription Status:', user.subscriptionStatus);

    // Buscar enrollment
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (!enrollment) {
      console.log('❌ No tiene enrollment activo');
      return;
    }

    console.log('\n📋 Enrollment:', {
      id: enrollment.id,
      mentorId: enrollment.mentorId,
      status: enrollment.status,
      cycleType: enrollment.cycleType,
      totalWeeks: enrollment.totalWeeks
    });

    if (enrollment.mentorId) {
      const mentor = await prisma.usuario.findUnique({
        where: { id: enrollment.mentorId },
        select: { id: true, nombre: true, email: true }
      });
      console.log('\n✅ Ya tiene mentor asignado:', mentor.nombre, '(' + mentor.email + ')');
      return;
    }

    // Buscar un mentor disponible de la misma organización
    const mentor = await prisma.usuario.findFirst({
      where: {
        rol: 'MENTOR',
        organizationId: user.organizationId,
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    if (!mentor) {
      console.log('\n❌ No hay mentores disponibles en la organización');
      return;
    }

    console.log('\n🎯 Mentor encontrado:', mentor.nombre, '(' + mentor.email + ')');

    // Asignar mentor al enrollment
    await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: {
        mentorId: mentor.id
      }
    });

    console.log('\n✅ Mentor asignado exitosamente!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignMentorToVision1();
