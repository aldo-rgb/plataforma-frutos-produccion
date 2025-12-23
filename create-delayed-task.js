const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDelayedTask() {
  try {
    // Buscar usuario 10 (que en realidad es ID 57)
    const usuario = await prisma.usuario.findUnique({
      where: { id: 57 }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', usuario.nombre, usuario.email);

    // Buscar carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        usuarioId: usuario.id,
        estado: 'APROBADA'
      }
    });

    if (!carta) {
      console.log('❌ No se encontró carta aprobada');
      return;
    }

    // Buscar meta
    const meta = await prisma.meta.findFirst({
      where: {
        cartaId: carta.id
      }
    });

    if (!meta) {
      console.log('❌ No se encontró meta');
      return;
    }

    // Buscar acción
    const accion = await prisma.accion.findFirst({
      where: {
        metaId: meta.id
      }
    });

    if (!accion) {
      console.log('❌ No se encontró acción');
      return;
    }

    console.log('✅ Acción encontrada:', accion.texto);

    // Crear fecha de hace 5 días (bien retrasada)
    const fechaRetrasada = new Date();
    fechaRetrasada.setDate(fechaRetrasada.getDate() - 5);
    fechaRetrasada.setHours(0, 0, 0, 0);

    // Crear tarea retrasada sin reagendar (postponeCount = 0)
    const tareaRetrasada = await prisma.taskInstance.create({
      data: {
        usuarioId: usuario.id,
        accionId: accion.id,
        dueDate: fechaRetrasada,
        originalDueDate: fechaRetrasada,
        status: 'PENDING',
        postponeCount: 0, // CLAVE: Sin reagendar
        evidenceStatus: 'NONE',
        createdAt: fechaRetrasada
      }
    });

    console.log('✅ Tarea retrasada creada exitosamente:');
    console.log({
      id: tareaRetrasada.id,
      dueDate: tareaRetrasada.dueDate,
      status: tareaRetrasada.status,
      postponeCount: tareaRetrasada.postponeCount,
      diasRetraso: Math.floor((new Date() - tareaRetrasada.dueDate) / (1000 * 60 * 60 * 24))
    });

    console.log('\n🔔 Esta tarea debería activar la alerta de procrastinación');
    console.log('   Criterio: >3 días de retraso + postponeCount = 0 (sin reagendar)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDelayedTask();
