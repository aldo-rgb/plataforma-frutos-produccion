// Script para verificar el conteo de participantes en las misiones
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissionParticipants() {
  try {
    const visionId = 2; // v1 gdl

    // 1. Ver las misiones activas de esta visión
    const missions = await prisma.trainerMission.findMany({
      where: { visionId, status: 'ACTIVE' },
      include: {
        _count: { select: { Submissions: true } },
        Template: { select: { title: true } }
      }
    });

    console.log('\n📋 Misiones activas en v1 gdl:');
    for (const m of missions) {
      console.log(`- ${m.Template?.title || 'Sin título'}: ${m._count.Submissions} submissions`);
    }

    // 2. Ver cuántos enrollments hay en la visión
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { visionId, enrollmentStatus: 'ENROLLED' },
      select: { userId: true }
    });
    console.log(`\n📝 Enrollments ENROLLED en v1 gdl: ${enrollments.length}`);
    
    // Ver detalles de los usuarios
    for (const e of enrollments) {
      const user = await prisma.usuario.findUnique({
        where: { id: e.userId },
        select: { nombre: true, rol: true }
      });
      console.log(`  - ${user?.nombre} (ID: ${e.userId}) - Rol: ${user?.rol}`);
    }

    // 3. Ver cuántos check-ins hay en productos de esta visión
    const products = await prisma.schoolProduct.findMany({
      where: { visionId },
      select: { id: true, name: true, level: true }
    });
    console.log('\n🎓 Productos de v1 gdl:');
    for (const p of products) {
      const checkIns = await prisma.checkInRecord.count({
        where: { productId: p.id }
      });
      console.log(`  - ${p.name} (${p.level}): ${checkIns} check-ins`);
    }

    // 4. Ver si la misión tiene productId o solo visionId
    const missionDetail = await prisma.trainerMission.findFirst({
      where: { visionId, status: 'ACTIVE' },
      select: { 
        id: true, 
        visionId: true, 
        productId: true, 
        squadId: true,
        Template: { select: { title: true } }
      }
    });
    console.log('\n🎯 Detalle de misión:');
    console.log(`  visionId: ${missionDetail?.visionId}`);
    console.log(`  productId: ${missionDetail?.productId}`);
    console.log(`  squadId: ${missionDetail?.squadId}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissionParticipants();
