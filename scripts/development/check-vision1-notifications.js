const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  console.log('🔍 VERIFICANDO NOTIFICACIONES DE vision1@frutos.com\n');

  try {
    // 1. Buscar el usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'vision1@frutos.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        assignedMentorId: true
      }
    });

    if (!usuario) {
      console.log('❌ Usuario vision1@frutos.com no encontrado\n');
      return;
    }

    console.log('👤 USUARIO ENCONTRADO:');
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Nombre: ${usuario.nombre}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Mentor Asignado: ${usuario.assignedMentorId || 'Ninguno'}\n`);

    // 2. Buscar notificaciones del usuario
    const notificaciones = await prisma.notification.findMany({
      where: { 
        userId: usuario.id,
        type: 'MENTOR_ASSIGNMENT'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (notificaciones.length === 0) {
      console.log('📭 No hay notificaciones de asignación de mentor\n');
      
      // Verificar si tiene mentor asignado pero sin notificación
      if (usuario.assignedMentorId) {
        console.log('⚠️ El usuario tiene mentor asignado pero no tiene notificación.');
        console.log('   Esto puede ser normal si la notificación ya fue leída y eliminada.\n');
      }
    } else {
      console.log(`📬 NOTIFICACIONES ENCONTRADAS: ${notificaciones.length}\n`);
      
      notificaciones.forEach((notif, index) => {
        console.log(`   ${index + 1}. NOTIFICACIÓN ID: ${notif.id}`);
        console.log(`      Título: ${notif.title}`);
        console.log(`      Mensaje: ${notif.message}`);
        console.log(`      Leída: ${notif.isRead ? '✅ SÍ' : '❌ NO'}`);
        console.log(`      Creada: ${notif.createdAt.toLocaleString('es-MX')}`);
        if (notif.updatedAt) {
          console.log(`      Actualizada: ${notif.updatedAt.toLocaleString('es-MX')}`);
        }
        console.log('');
      });
    }

    // 3. Verificar programas activos
    const programas = await prisma.programEnrollment.findMany({
      where: {
        userId: usuario.id
      },
      include: {
        CallBookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          select: {
            id: true,
            scheduledAt: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (programas.length > 0) {
      console.log(`📚 PROGRAMAS INTENSIVOS: ${programas.length}\n`);
      
      programas.forEach((prog, index) => {
        console.log(`   ${index + 1}. PROGRAMA ID: ${prog.id}`);
        console.log(`      Estado: ${prog.status}`);
        console.log(`      Mentor ID: ${prog.mentorId}`);
        console.log(`      Sesiones Activas: ${prog.CallBookings.length}`);
        console.log(`      Creado: ${prog.createdAt.toLocaleString('es-MX')}`);
        console.log('');
      });
    } else {
      console.log('📚 No tiene programas intensivos activos\n');
    }

    // 4. Resumen
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN:');
    console.log(`   • Mentor Asignado: ${usuario.assignedMentorId ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   • Notificaciones MENTOR_ASSIGNMENT: ${notificaciones.length}`);
    console.log(`   • Notificaciones sin leer: ${notificaciones.filter(n => !n.isRead).length}`);
    console.log(`   • Programas activos: ${programas.filter(p => p.status === 'ACTIVE').length}`);
    
    const sinLeer = notificaciones.filter(n => !n.isRead).length;
    if (sinLeer > 0) {
      console.log('\n⚠️ ACCIÓN REQUERIDA:');
      console.log('   El usuario tiene notificaciones sin leer.');
      console.log('   Cuando reagende sus llamadas, estas notificaciones');
      console.log('   se marcarán automáticamente como leídas.\n');
    } else if (notificaciones.length > 0) {
      console.log('\n✅ Todas las notificaciones han sido leídas.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
