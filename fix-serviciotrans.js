const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTaskInstancesForServiceTrans(userId) {
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: userId },
    select: { id: true }
  });

  if (!carta) {
    console.log('  Usuario sin carta');
    return;
  }

  // Obtener acciones de servicioTrans sin TaskInstance
  const acciones = await prisma.accion.findMany({
    where: {
      Meta: { cartaId: carta.id, categoria: 'servicioTrans' }
    },
    select: { id: true }
  });

  console.log('  Acciones de servicioTrans:', acciones.length);

  for (const accion of acciones) {
    // Verificar si ya existe TaskInstance
    const existing = await prisma.taskInstance.findFirst({
      where: { usuarioId: userId, accionId: accion.id }
    });

    if (!existing) {
      await prisma.taskInstance.create({
        data: {
          usuarioId: userId,
          accionId: accion.id,
          status: 'PENDING',
          isWeekly: false
        }
      });
      console.log('    TaskInstance creada para acción', accion.id);
    }
  }
}

async function createServiceTransMetas(userId) {
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: userId },
    select: { id: true }
  });

  if (!carta) {
    console.log('  Usuario sin carta');
    return;
  }

  // Verificar si ya tiene metas servicioTrans
  const existing = await prisma.meta.count({
    where: { cartaId: carta.id, categoria: 'servicioTrans' }
  });

  if (existing > 0) {
    console.log('  Ya tiene', existing, 'metas servicioTrans');
    return;
  }

  // Crear 4 metas servicioTrans con sus acciones
  const metasData = [
    { orden: 1, metaPrincipal: 'Registrar una persona en la plataforma' },
    { orden: 2, metaPrincipal: 'Registrar una persona en la plataforma' },
    { orden: 3, metaPrincipal: 'Registrar una persona en la plataforma' },
    { orden: 4, metaPrincipal: 'Registrar una persona en la plataforma' }
  ];

  for (const metaData of metasData) {
    const meta = await prisma.meta.create({
      data: {
        cartaId: carta.id,
        categoria: 'servicioTrans',
        orden: metaData.orden,
        metaPrincipal: metaData.metaPrincipal,
        declaracionPoder: 'Compartir esta oportunidad de crecimiento',
        status: 'PENDING'
      }
    });
    console.log('  Meta creada:', meta.id);

    const accion = await prisma.accion.create({
      data: {
        metaId: meta.id,
        orden: 1,
        descripcion: 'Invitar a alguien a registrarse usando tu código de referido'
      }
    });
    console.log('    Accion creada:', accion.id);

    const task = await prisma.taskInstance.create({
      data: {
        usuarioId: userId,
        accionId: accion.id,
        status: 'PENDING',
        isWeekly: false
      }
    });
    console.log('    TaskInstance creada:', task.id);
  }
}

async function syncTasks(userId) {
  const invitedCount = await prisma.usuario.count({
    where: { invitedBy: userId }
  });

  console.log('  Invitados:', invitedCount);

  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: userId },
    select: { id: true }
  });

  const tasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId: userId,
      status: 'PENDING',
      Accion: { Meta: { categoria: 'servicioTrans', cartaId: carta.id } }
    },
    orderBy: { id: 'asc' },
    take: invitedCount
  });

  for (const task of tasks) {
    await prisma.taskInstance.update({
      where: { id: task.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
    console.log('    Tarea completada:', task.id);
  }
}

async function main() {
  // SAMANTHA - tiene acciones pero no tasks
  console.log('\n=== Samantha (ID: 91) - Crear TaskInstances ===');
  await createTaskInstancesForServiceTrans(91);
  await syncTasks(91);

  // LIZBETH - no tiene metas servicioTrans
  console.log('\n=== Lizbeth (ID: 115) - Crear metas y tasks ===');
  await createServiceTransMetas(115);
  await syncTasks(115);

  // RODRIGO - no tiene metas servicioTrans
  console.log('\n=== Rodrigo (ID: 126) - Crear metas y tasks ===');
  await createServiceTransMetas(126);
  await syncTasks(126);
}

main().then(() => process.exit(0));
