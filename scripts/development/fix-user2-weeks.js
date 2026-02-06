const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUser2Weeks() {
  try {
    console.log('🔧 Corrigiendo semanas de user 2...\n');

    // Buscar user 2
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: { contains: 'user2' } },
          { nombre: { contains: 'user 2' } },
          { nombre: { contains: 'User2' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ User 2 no encontrado');
      return;
    }

    console.log('📋 Usuario encontrado:');
    console.log('   ID:', user.id);
    console.log('   Nombre:', user.nombre);

    // Buscar enrollment activo
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (!enrollment) {
      console.log('\n⚠️ No tiene enrollment activo');
      return;
    }

    console.log('\n📊 Enrollment actual:');
    console.log('   ID:', enrollment.id);
    console.log('   Start:', enrollment.cycleStartDate);
    console.log('   End:', enrollment.cycleEndDate);
    console.log('   Total Weeks (actual):', enrollment.totalWeeks);

    // Calcular semanas correctas
    const start = new Date(enrollment.cycleStartDate);
    const end = new Date(enrollment.cycleEndDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const correctWeeks = Math.ceil(diffDays / 7);

    console.log('\n🔢 Cálculo:');
    console.log('   Días totales:', diffDays);
    console.log('   Semanas correctas:', correctWeeks);

    if (enrollment.totalWeeks === correctWeeks) {
      console.log('\n✅ Las semanas ya están correctas!');
      return;
    }

    console.log('\n❌ Discrepancia detectada!');
    console.log('   Actual:', enrollment.totalWeeks);
    console.log('   Correcto:', correctWeeks);

    // Actualizar
    await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: {
        totalWeeks: correctWeeks
      }
    });

    console.log('\n✅ Enrollment actualizado con', correctWeeks, 'semanas');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser2Weeks();
