const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Verificar todos los enrollments de visión 19
  const allEnrollments = await prisma.vision_enrollments.findMany({
    where: { visionId: 19 },
    include: { 
      Usuario_vision_enrollments_userIdToUsuario: { select: { id: true, nombre: true, email: true } }
    },
    orderBy: { enrolledAt: 'desc' }
  });
  
  console.log('=== TODOS LOS ENROLLMENTS DE VISION 19 ===');
  console.log('Total:', allEnrollments.length);
  allEnrollments.forEach(e => {
    const u = e.Usuario_vision_enrollments_userIdToUsuario;
    console.log(`ID: ${e.id}, User: ${u?.nombre} (${u?.email}), Level: ${e.level}, Status: ${e.enrollmentStatus}`);
  });
  
  // Buscar específicamente a Bryan
  const bryan = await prisma.vision_enrollments.findFirst({
    where: { 
      visionId: 19,
      Usuario_vision_enrollments_userIdToUsuario: { email: 'bryannov13@gmail.com' }
    },
    include: { Usuario_vision_enrollments_userIdToUsuario: true }
  });
  
  console.log('\n=== ENROLLMENT DE BRYAN EN VISION 19 ===');
  console.log(bryan ? JSON.stringify(bryan, null, 2) : 'No encontrado');
  
  // Verificar VisionParticipante para visión 19
  const participantes = await prisma.visionParticipante.findMany({
    where: { visionId: 19 },
    include: { Participante: { select: { id: true, nombre: true, email: true } } }
  });
  
  console.log('\n=== VISION PARTICIPANTES DE VISION 19 ===');
  console.log('Total:', participantes.length);
  participantes.forEach(p => {
    console.log(`ID: ${p.id}, Participante: ${p.Participante?.nombre} (${p.Participante?.email})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
