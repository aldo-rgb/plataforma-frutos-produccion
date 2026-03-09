const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar a Dora Maria
  const user = await prisma.usuario.findFirst({
    where: { 
      OR: [
        { email: 'chandli487@gmail.com' },
        { nombre: { contains: 'Dora Maria' } }
      ]
    },
    select: { id: true, nombre: true, email: true }
  });
  console.log('Usuario:', user);
  
  if (!user) return;
  
  // Ver sus TaskInstances con evidencia PENDING
  const tasksPending = await prisma.taskInstance.findMany({
    where: {
      usuarioId: user.id,
      evidenceStatus: 'PENDING'
    },
    include: {
      Accion: { select: { texto: true } },
      EvidenciaAccion: { select: { id: true, estado: true, fechaRevision: true, revisadoPorId: true } }
    },
    orderBy: { dueDate: 'desc' }
  });
  
  console.log('\n=== Tasks con evidenceStatus PENDING ===');
  tasksPending.forEach(t => {
    console.log({
      taskId: t.id,
      accion: t.Accion?.texto?.substring(0, 60),
      taskStatus: t.status,
      evidenceStatus: t.evidenceStatus,
      evidenciaId: t.evidenciaId,
      evidenciaEstado: t.EvidenciaAccion?.estado,
      evidenciaRevisada: !!t.EvidenciaAccion?.fechaRevision,
      evidenciaRevisadaPorId: t.EvidenciaAccion?.revisadoPorId
    });
  });

  // Buscar evidencias APROBADAS del usuario que su TaskInstance aún está en PENDING
  const evidenciasAprobadas = await prisma.evidenciaAccion.findMany({
    where: {
      usuarioId: user.id,
      estado: 'APROBADA'
    },
    orderBy: { fechaRevision: 'desc' },
    take: 10
  });

  console.log('\n=== Últimas 10 evidencias APROBADAS ===');
  for (const ev of evidenciasAprobadas) {
    // Buscar si hay TaskInstance con esta evidencia
    const task = await prisma.taskInstance.findFirst({
      where: {
        evidenciaId: ev.id
      },
      select: { id: true, status: true, evidenceStatus: true }
    });
    
    console.log({
      evidenciaId: ev.id,
      accionId: ev.accionId,
      estado: ev.estado,
      fechaRevision: ev.fechaRevision,
      taskInstance: task ? {
        id: task.id,
        status: task.status,
        evidenceStatus: task.evidenceStatus
      } : 'NO ENCONTRADO'
    });
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
