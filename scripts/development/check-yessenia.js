const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findUnique({
    where: { email: 'yesenia.gzz95@hotmail.com' },
    select: { id: true, nombre: true, email: true, imagen: true, profileImage: true }
  });
  
  if (!user) {
    console.log('Usuario no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Usuario:', user.nombre, '(ID:', user.id, ')');
  console.log('Imagen:', user.imagen || user.profileImage || 'SIN FOTO');
  
  const questionnaire = await prisma.advancedQuestionnaire.findUnique({
    where: { userId: user.id }
  });
  
  console.log('\nCuestionario Avanzado:', questionnaire ? 'EXISTE' : 'NO EXISTE');
  if (questionnaire) {
    console.log('  ID:', questionnaire.id);
    console.log('  isComplete:', questionnaire.isComplete);
    console.log('  Creado:', questionnaire.createdAt);
  }
  
  const enrollments = await prisma.vision_enrollments.findMany({
    where: { userId: user.id },
    include: { Vision: { select: { id: true, nombre: true } } }
  });
  
  console.log('\nEnrollments:');
  enrollments.forEach(e => {
    console.log('  -', e.Vision?.nombre, '| Level:', e.level, '| Status:', e.enrollmentStatus);
  });
  
  await prisma.$disconnect();
}

check().catch(console.error);
