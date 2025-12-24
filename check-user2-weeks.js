const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser2() {
  try {
    // Buscar user2
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
      console.log('❌ User2 no encontrado');
      return;
    }

    console.log('\n📋 USER 2:');
    console.log('ID:', user.id);
    console.log('Nombre:', user.nombre);
    console.log('Email:', user.email);
    console.log('Vision ID:', user.visionId);

    // Buscar enrollment
    const enrollment = await prisma.programEnrollment.findFirst({
      where: { userId: user.id, status: 'ACTIVE' }
    });

    if (!enrollment) {
      console.log('\n⚠️ No tiene enrollment activo');
      return;
    }

    console.log('\n📊 ENROLLMENT:');
    console.log('ID:', enrollment.id);
    console.log('Cycle Type:', enrollment.cycleType);
    console.log('Start Date:', enrollment.cycleStartDate);
    console.log('End Date:', enrollment.cycleEndDate);
    console.log('Total Weeks (DB):', enrollment.totalWeeks);
    console.log('Vision ID:', enrollment.visionId);

    // Buscar visión
    if (enrollment.visionId) {
      const vision = await prisma.vision.findUnique({
        where: { id: enrollment.visionId }
      });
      
      if (vision) {
        console.log('\n🎯 VISION:');
        console.log('Nombre:', vision.name);
        console.log('Start Date:', vision.startDate);
        console.log('End Date:', vision.endDate);
      }
    }

    // Calcular semanas reales
    if (enrollment.cycleStartDate && enrollment.cycleEndDate) {
      const start = new Date(enrollment.cycleStartDate);
      const end = new Date(enrollment.cycleEndDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const realWeeks = Math.ceil(diffDays / 7);
      
      console.log('\n🔢 CÁLCULO:');
      console.log('Días totales:', diffDays);
      console.log('Semanas reales:', realWeeks);
      console.log('Semanas en DB:', enrollment.totalWeeks);
      
      if (realWeeks !== enrollment.totalWeeks) {
        console.log('\n❌ DISCREPANCIA ENCONTRADA!');
        console.log('   Debe actualizar enrollment.totalWeeks de', enrollment.totalWeeks, 'a', realWeeks);
      } else {
        console.log('\n✅ Semanas correctas');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser2();
