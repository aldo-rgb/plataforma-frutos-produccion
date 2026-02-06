const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser2Enrollment() {
  try {
    // Buscar user2
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: { contains: 'user2' } },
          { nombre: { contains: 'user 2' } },
          { nombre: { contains: 'User2' } }
        ]
      },
      include: {
        ProgramEnrollment: {
          include: {
            Vision: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User2 no encontrado');
      return;
    }

    console.log('\n📋 USER 2 INFO:');
    console.log('ID:', user.id);
    console.log('Nombre:', user.nombre);
    console.log('Email:', user.email);
    console.log('Vision ID:', user.visionId);

    if (user.ProgramEnrollment && user.ProgramEnrollment.length > 0) {
      const enrollment = user.ProgramEnrollment[0];
      console.log('\n📊 ENROLLMENT:');
      console.log('ID:', enrollment.id);
      console.log('Cycle Type:', enrollment.cycleType);
      console.log('Start Date:', enrollment.cycleStartDate);
      console.log('End Date:', enrollment.cycleEndDate);
      console.log('Total Weeks (guardado):', enrollment.totalWeeks);
      console.log('Status:', enrollment.status);

      if (enrollment.Vision) {
        console.log('\n🎯 VISION:');
        console.log('ID:', enrollment.Vision.id);
        console.log('Nombre:', enrollment.Vision.name);
        console.log('Start Date:', enrollment.Vision.startDate);
        console.log('End Date:', enrollment.Vision.endDate);
      }

      // Calcular semanas reales
      if (enrollment.cycleStartDate && enrollment.cycleEndDate) {
        const start = new Date(enrollment.cycleStartDate);
        const end = new Date(enrollment.cycleEndDate);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const realWeeks = Math.ceil(diffDays / 7);
        
        console.log('\n🔢 CÁLCULO REAL:');
        console.log('Días totales:', diffDays);
        console.log('Semanas reales:', realWeeks);
        console.log('Semanas guardadas en DB:', enrollment.totalWeeks);
        console.log('❌ DISCREPANCIA:', realWeeks !== enrollment.totalWeeks ? 'SÍ' : 'NO');
      }
    } else {
      console.log('\n⚠️ No tiene enrollment activo');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser2Enrollment();
