const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const participantes = await prisma.visionParticipante.count();
  const gameChangers = await prisma.visionGameChanger.count();
  const mentores = await prisma.visionMentor.count();
  const enrollments = await prisma.vision_enrollments.count();
  
  console.log('=== CONTEOS DE TABLAS ===');
  console.log('VisionParticipante:', participantes);
  console.log('VisionGameChanger:', gameChangers);
  console.log('VisionMentor:', mentores);
  console.log('vision_enrollments:', enrollments);
  
  const visiones = await prisma.vision.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          VisionParticipante: true,
          VisionGameChanger: true,
          VisionMentor: true,
          vision_enrollments: true
        }
      }
    }
  });
  
  console.log('\n=== VISIONES ACTIVAS CON CONTEOS ===');
  visiones.forEach(v => {
    console.log(v.nombre + ':');
    console.log('  VisionParticipante:', v._count.VisionParticipante);
    console.log('  VisionGameChanger:', v._count.VisionGameChanger);
    console.log('  VisionMentor:', v._count.VisionMentor);
    console.log('  vision_enrollments:', v._count.vision_enrollments);
  });
  
  await prisma.$disconnect();
}
check();
