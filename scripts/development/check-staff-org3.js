const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgId = 3;
  
  // VisionStaff (Trainers)
  const visionStaff = await prisma.visionStaff.findMany({
    where: {
      Vision: { organizationId: orgId }
    },
    select: {
      role: true,
      Usuario_VisionStaff_userIdToUsuario: {
        select: { id: true, nombre: true, rol: true }
      }
    }
  });
  
  console.log('VisionStaff (Trainers):');
  visionStaff.forEach(vs => {
    const user = vs.Usuario_VisionStaff_userIdToUsuario;
    console.log(`  - ${user?.nombre} | role en VisionStaff: ${vs.role} | rol Usuario: ${user?.rol}`);
  });
  
  // Staff directo
  const staffDirecto = await prisma.usuario.findMany({
    where: {
      organizationId: orgId,
      rol: { in: ['TRAINER', 'COORDINADOR', 'GAMECHANGER', 'MENTOR', 'LIDER'] }
    },
    select: { id: true, nombre: true, rol: true }
  });
  
  console.log('\nStaff Directo por rol:');
  staffDirecto.forEach(s => {
    console.log(`  - ${s.nombre} | rol: ${s.rol}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
