const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJorge() {
  try {
    const email = 'jorge@frutos.com';
    
    // 1. Usuario básico
    const usuario = await prisma.usuario.findUnique({
      where: { email: email },
      include: {
        LicenseAssignment_LicenseAssignment_userIdToUsuario: {
          include: {
            LicenseType: true
          }
        }
      }
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
    console.log('Licencias:', usuario.LicenseAssignment_LicenseAssignment_userIdToUsuario?.length || 0);
    
    if (usuario.LicenseAssignment_LicenseAssignment_userIdToUsuario?.length > 0) {
      usuario.LicenseAssignment_LicenseAssignment_userIdToUsuario.forEach(lic => {
        console.log(`  - ${lic.LicenseType?.name || 'N/A'}: ${lic.status} (${lic.startDate} - ${lic.endDate})`);
      });
    }

    // 2. Enrollments
    const enrollments = await prisma.programEnrollment.findMany({
      where: { userId: usuario.id },
      include: {
        Vision: true,
        Organization: true
      },
      orderBy: { enrollmentDate: 'desc' }
    });

    console.log('\n========== ENROLLMENTS ==========');
    console.log('Total:', enrollments.length);
    enrollments.forEach(e => {
      console.log(`\nID: ${e.id}`);
      console.log('Visión:', e.Vision?.nombre || 'N/A');
      console.log('Organización:', e.Organization?.nombre || 'N/A');
      console.log('Fecha Enrollment:', e.enrollmentDate);
      console.log('Fecha Inicio:', e.startDate);
      console.log('Fecha Fin:', e.endDate);
      console.log('Estado:', e.status);
      console.log('Tipo Pago:', e.paymentType);
      console.log('Ciclo Activo:', e.cycleActive);
    });

    // 3. Cartas
    const cartas = await prisma.cartaFrutos.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n========== CARTAS ==========');
    console.log('Total:', cartas.length);
    cartas.forEach(c => {
      console.log(`\nID: ${c.id}`);
      console.log('Estado:', c.status);
      console.log('Fecha Creación:', c.createdAt);
      console.log('Fecha Autorización:', c.reviewedAt);
      console.log('Autorizado Por:', c.reviewedBy);
    });

    // 4. Objetivos Personales (Metas)
    const objetivos = await prisma.vision.findMany({
      where: { userId: usuario.id },
      include: {
        AreaDesarrollo: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n========== OBJETIVOS/METAS ==========');
    console.log('Total:', objetivos.length);
    if (objetivos.length > 0) {
      objetivos.forEach(obj => {
        console.log(`\nID: ${obj.id}`);
        console.log('Título:', obj.titulo || obj.nombre);
        console.log('Área:', obj.AreaDesarrollo?.nombre || 'Sin área');
        console.log('Estado:', obj.estado || obj.status);
        console.log('Fecha Creación:', obj.createdAt);
        console.log('Fecha Inicio:', obj.fechaInicio || obj.startDate);
        console.log('Fecha Límite:', obj.fechaLimite || obj.endDate);
      });
    } else {
      console.log('⚠️ NO HAY OBJETIVOS CREADOS');
    }

    // 5. Tareas
    const tareas = await prisma.taskInstance.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('\n========== TAREAS (últimas 10) ==========');
    console.log('Total:', tareas.length);
    tareas.forEach(t => {
      console.log(`\n- ${t.titulo}`);
      console.log('  Estado:', t.status);
      console.log('  Fecha:', t.fecha || t.dueDate);
      console.log('  Vision ID:', t.visionId || 'Sin visión');
    });

    // 6. AvanceObjetivo - Verificar si existe esta tabla
    try {
      const submissions = await prisma.taskSubmission.findMany({
        where: { 
          usuarioId: usuario.id
        },
        take: 5
      });

      console.log('\n========== TASK SUBMISSIONS ==========');
      console.log('Total:', submissions.length);
    } catch (err) {
      console.log('\n========== TASK SUBMISSIONS ==========');
      console.log('No disponible o error');
    }

    // 7. Verificar si tiene WeeklyGoal
    try {
      const checkIns = await prisma.checkIn.findMany({
        where: { usuarioId: usuario.id },
        orderBy: { fecha: 'desc' },
        take: 5
      });

      console.log('\n========== CHECK-INS ==========');
      console.log('Total:', checkIns.length);
    } catch (err) {
      console.log('\n========== CHECK-INS ==========');
      console.log('No disponible o error');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJorge();
