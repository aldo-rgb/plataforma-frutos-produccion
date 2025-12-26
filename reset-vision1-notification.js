const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetNotification() {
  console.log('🔄 RESTAURAR NOTIFICACIÓN A NO LEÍDA\n');

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'vision1@frutos.com' },
      select: { id: true, nombre: true }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado\n');
      return;
    }

    console.log(`👤 Usuario: ${usuario.nombre} (ID: ${usuario.id})\n`);

    // Marcar las notificaciones como NO leídas
    const resultado = await prisma.notification.updateMany({
      where: {
        userId: usuario.id,
        type: 'MENTOR_ASSIGNMENT'
      },
      data: {
        isRead: false
      }
    });

    console.log(`✅ Notificaciones restauradas: ${resultado.count}\n`);

    // Verificar estado
    const notificaciones = await prisma.notification.findMany({
      where: {
        userId: usuario.id,
        type: 'MENTOR_ASSIGNMENT'
      }
    });

    console.log('📬 ESTADO ACTUAL DE LAS NOTIFICACIONES:\n');
    notificaciones.forEach((n, i) => {
      console.log(`   ${i + 1}. ID ${n.id}: "${n.title}"`);
      console.log(`      Mensaje: ${n.message}`);
      console.log(`      Leída: ${n.isRead ? '✅ SÍ' : '❌ NO'}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ LISTO PARA PROBAR');
    console.log('   1. Inicia sesión como vision1@frutos.com');
    console.log('   2. Verás la notificación en el dashboard');
    console.log('   3. Haz clic en "Reagendar Llamadas"');
    console.log('   4. Completa el proceso de reagendamiento');
    console.log('   5. La notificación desaparecerá automáticamente\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetNotification();
