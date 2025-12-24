const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUser2Enrollment() {
  try {
    console.log('🔧 Corrigiendo enrollment de User 2...\n');

    // Obtener la visión
    const vision = await prisma.vision.findUnique({
      where: { id: 1 }
    });

    if (!vision) {
      console.log('❌ Visión no encontrada');
      return;
    }

    console.log('🎯 Visión:', vision.name);
    console.log('   Start:', vision.startDate);
    console.log('   End:', vision.endDate);

    // Calcular semanas correctas
    const start = new Date(vision.startDate);
    const end = new Date(vision.endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.ceil(diffDays / 7);

    console.log('\n🔢 Cálculo:');
    console.log('   Días:', diffDays);
    console.log('   Semanas:', totalWeeks);

    // Obtener enrollment de User 2 (ID 6) sin filtrar por visionId
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: 6,
        status: 'ACTIVE'
      }
    });

    if (!enrollment) {
      console.log('\n❌ Enrollment no encontrado');
      return;
    }

    console.log('\n📊 Enrollment actual (User 2):');
    console.log('   ID:', enrollment.id);
    console.log('   cycleStartDate:', enrollment.cycleStartDate);
    console.log('   cycleEndDate:', enrollment.cycleEndDate);
    console.log('   totalWeeks:', enrollment.totalWeeks);

    // Actualizar con las fechas correctas de la visión
    const updated = await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: {
        cycleStartDate: vision.startDate,
        cycleEndDate: vision.endDate,
        totalWeeks: totalWeeks
      }
    });

    console.log('\n✅ Enrollment actualizado:');
    console.log('   cycleStartDate:', updated.cycleStartDate);
    console.log('   cycleEndDate:', updated.cycleEndDate);
    console.log('   totalWeeks:', updated.totalWeeks);
    console.log('\n🎉 Usuario User 2 ahora muestra', totalWeeks, 'semanas correctamente!');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser2Enrollment();
