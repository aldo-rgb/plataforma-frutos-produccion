const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const userId = 126; // Rodrigo Abed Martínez
  
  // Verificar si existe AdminTask para arquetipos
  let adminTask = await prisma.adminTask.findFirst({
    where: { type: 'ARCHETYPE_REVIEW' }
  });
  console.log('AdminTask existente:', adminTask);

  // Si no existe, crearlo
  if (!adminTask) {
    console.log('Creando AdminTask...');
    adminTask = await prisma.adminTask.create({
      data: {
        titulo: 'Revisa tu Personaje Asignado',
        descripcion: 'Tu entrenador te ha asignado un personaje. Revisa los detalles de tu personaje en la sección de Personajes.',
        pointsReward: 100,
        type: 'ARCHETYPE_REVIEW',
        requiereEvidencia: false,
        isActive: true,
        targetType: 'ALL',
        createdBy: 1, // Admin user
        updatedAt: new Date()
      }
    });
    console.log('AdminTask creado:', adminTask.id);
  }

  // Verificar si ya existe TaskSubmission
  const existing = await prisma.taskSubmission.findFirst({
    where: {
      usuarioId: userId,
      adminTaskId: adminTask.id
    }
  });
  
  if (existing) {
    console.log('Ya existe TaskSubmission:', existing.id);
  } else {
    // Crear TaskSubmission
    const submission = await prisma.taskSubmission.create({
      data: {
        usuarioId: userId,
        adminTaskId: adminTask.id,
        status: 'PENDING'
      }
    });
    console.log('TaskSubmission creada:', submission.id);
  }

  await prisma.$disconnect();
}

fix().catch(console.error);
