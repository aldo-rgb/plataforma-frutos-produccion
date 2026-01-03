const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentorAssignment() {
  try {
    console.log('🔍 Verificando asignación de mentor después de pago...\n');

    // Buscar la última orden de lobo solitario completada
    const ultimaOrden = await prisma.ordenLoboSolitario.findFirst({
      where: {
        estado: 'COMPLETADO'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        Usuario: true,
        Mentor: true
      }
    });

    if (!ultimaOrden) {
      console.log('❌ No se encontraron órdenes completadas');
      return;
    }

    console.log('📦 Última orden completada:');
    console.log('   ID:', ultimaOrden.id);
    console.log('   Estado:', ultimaOrden.estado);
    console.log('   Fecha:', ultimaOrden.createdAt);
    console.log('   Usuario:', ultimaOrden.Usuario.nombre);
    console.log('   Mentor seleccionado en orden:', ultimaOrden.Mentor?.nombre || 'NO ASIGNADO');
    console.log('\n👤 Estado del usuario:');
    console.log('   ID:', ultimaOrden.Usuario.id);
    console.log('   assignedMentorId:', ultimaOrden.Usuario.assignedMentorId);
    console.log('   Tier:', ultimaOrden.Usuario.tier);
    console.log('   Estado suscripción:', ultimaOrden.Usuario.estadoSuscripcion);

    // Verificar ProgramEnrollment
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: ultimaOrden.usuarioId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📝 Program Enrollment:');
    if (enrollment) {
      console.log('   ID:', enrollment.id);
      console.log('   Status:', enrollment.status);
      console.log('   mentorId:', enrollment.mentorId);
    } else {
      console.log('   ❌ No existe enrollment');
    }

    // Verificar licencia
    const licencia = await prisma.licenseAssignment.findFirst({
      where: {
        userId: ultimaOrden.usuarioId,
        isActive: true
      },
      orderBy: {
        activatedAt: 'desc'
      }
    });

    console.log('\n🎫 Licencia:');
    if (licencia) {
      console.log('   Código:', licencia.licenseCode);
      console.log('   Activa:', licencia.isActive);
      console.log('   Expira:', licencia.expiresAt);
    } else {
      console.log('   ❌ No hay licencia activa');
    }

    console.log('\n\n📊 DIAGNÓSTICO:');
    if (!ultimaOrden.Usuario.assignedMentorId) {
      console.log('❌ PROBLEMA: assignedMentorId NO fue asignado en Usuario');
      console.log('   Solución: El endpoint payment-success debe actualizar usuario.assignedMentorId');
    } else {
      console.log('✅ assignedMentorId está asignado correctamente');
    }

    if (!enrollment || !enrollment.mentorId) {
      console.log('❌ PROBLEMA: ProgramEnrollment no tiene mentorId');
      console.log('   Solución: El endpoint payment-success debe crear/actualizar enrollment con mentorId');
    } else {
      console.log('✅ ProgramEnrollment tiene mentorId asignado');
    }

    if (ultimaOrden.Usuario.tier === 'FREE') {
      console.log('❌ PROBLEMA: Usuario sigue siendo FREE después del pago');
      console.log('   Solución: El endpoint payment-success debe actualizar usuario.tier');
    } else {
      console.log('✅ Usuario tiene tier:', ultimaOrden.Usuario.tier);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentorAssignment();
