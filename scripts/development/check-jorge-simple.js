const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJorge() {
  try {
    const email = 'jorge@frutos.com';
    
    // 1. Usuario básico
    const usuario = await prisma.usuario.findUnique({
      where: { email: email }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('\n========== USUARIO ==========');
    console.log('ID:', usuario.id);
    console.log('Nombre:', usuario.nombre);
    console.log('Email:', usuario.email);
    console.log('Rol:', usuario.rol);
    console.log('Activo:', usuario.isActive);

    // 2. Cartas
    const cartas = await prisma.cartaFrutos.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fechaCreacion: 'desc' }
    });

    console.log('\n========== CARTAS ==========');
    console.log('Total:', cartas.length);
    if (cartas.length > 0) {
      const ultima = cartas[0];
      console.log('\nÚltima carta:');
      console.log('ID:', ultima.id);
      console.log('Estado:', ultima.estado);
      console.log('Fecha Creación:', ultima.fechaCreacion);
      console.log('Autorizado Mentor:', ultima.autorizadoMentor);
      console.log('Autorizado Coord:', ultima.autorizadoCoord);
      console.log('Autorizado Por ID:', ultima.autorizadoPorId);
      console.log('Fecha Actualización:', ultima.fechaActualizacion);
    }

    // 3. License Assignments
    const licenses = await prisma.licenseAssignment.findMany({
      where: { userId: usuario.id },
      include: {
        Vision: true,
        Organization: true
      },
      orderBy: { assignedAt: 'desc' }
    });

    console.log('\n========== LICENCIAS ==========');
    console.log('Total:', licenses.length);
    licenses.forEach(lic => {
      console.log(`\nCódigo: ${lic.licenseCode}`);
      console.log('Activa:', lic.isActive);
      console.log('Fecha Asignación:', lic.assignedAt);
      console.log('Fecha Activación:', lic.activatedAt);
      console.log('Expira:', lic.expiresAt);
      console.log('Visión:', lic.Vision?.nombre || 'Sin visión');
      console.log('Organización:', lic.Organization?.nombre || 'N/A');
    });

    // 4. Program Enrollments
    const enrollments = await prisma.programEnrollment.findMany({
      where: { userId: usuario.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n========== PROGRAM ENROLLMENTS ==========');
    console.log('Total:', enrollments.length);
    enrollments.forEach(e => {
      console.log(`\nID: ${e.id}`);
      console.log('Fecha Inicio:', e.startDate);
      console.log('Fecha Fin:', e.endDate);
      console.log('Tipo Ciclo:', e.cycleType);
      console.log('Estado:', e.status);
      console.log('Semanas Totales:', e.totalWeeks);
      console.log('Mentor ID:', e.mentorId);
    });

    // 5. Tareas (TaskInstance)
    const tareas = await prisma.taskInstance.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        Accion: {
          include: {
            AreaDesarrollo: true
          }
        }
      }
    });

    console.log('\n========== TAREAS (últimas 20) ==========');
    console.log('Total:', tareas.length);
    if (tareas.length > 0) {
      tareas.forEach(t => {
        console.log(`\n- Acción: ${t.Accion?.titulo || 'N/A'}`);
        console.log('  Área:', t.Accion?.AreaDesarrollo?.nombre || 'Sin área');
        console.log('  Estado:', t.status);
        console.log('  Fecha Due:', t.dueDate);
        console.log('  Fecha Original:', t.originalDueDate);
        console.log('  Día Semana:', t.dayOfWeek);
      });
    } else {
      console.log('⚠️ NO HAY TAREAS CREADAS');
    }

    // 6. Acciones del usuario (desde la carta)
    const acciones = await prisma.accion.findMany({
      where: { usuarioId: usuario.id },
      include: {
        AreaDesarrollo: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n========== ACCIONES ==========');
    console.log('Total:', acciones.length);
    if (acciones.length > 0) {
      acciones.forEach(a => {
        console.log(`\n- ${a.titulo}`);
        console.log('  Área:', a.AreaDesarrollo?.nombre || 'Sin área');
        console.log('  Días programados:', a.scheduledDays);
        console.log('  Creada:', a.createdAt);
      });
    } else {
      console.log('⚠️ NO HAY ACCIONES CREADAS');
    }

    // 7. Check-ins
    const checkIns = await prisma.checkIn.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fecha: 'desc' },
      take: 5
    });

    console.log('\n========== CHECK-INS (últimos 5) ==========');
    console.log('Total:', checkIns.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJorge();
