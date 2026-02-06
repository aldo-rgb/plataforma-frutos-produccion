const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMarkNotificationsRead() {
  console.log('🧪 PRUEBA: Marcar notificaciones como leídas\n');

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

    // Verificar notificaciones antes
    const notifAntes = await prisma.notification.findMany({
      where: {
        userId: usuario.id,
        type: 'MENTOR_ASSIGNMENT',
        isRead: false
      }
    });

    console.log(`📬 Notificaciones sin leer ANTES: ${notifAntes.length}`);
    if (notifAntes.length > 0) {
      notifAntes.forEach(n => {
        console.log(`   - ID ${n.id}: "${n.title}"`);
      });
    }
    console.log('');

    // Simular lo que hace el endpoint de reagendar
    console.log('🔄 Marcando notificaciones como leídas...\n');
    
    const resultado = await prisma.notification.updateMany({
      where: {
        userId: usuario.id,
        type: 'MENTOR_ASSIGNMENT',
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    console.log(`✅ Notificaciones actualizadas: ${resultado.count}\n`);

    // Verificar notificaciones después
    const notifDespues = await prisma.notification.findMany({
      where: {
        userId: usuario.id,
        type: 'MENTOR_ASSIGNMENT',
        isRead: false
      }
    });

    console.log(`📬 Notificaciones sin leer DESPUÉS: ${notifDespues.length}\n`);

    // Verificar todas las notificaciones del tipo
    const todasNotif = await prisma.notification.findMany({
      where: {
        userId: usuario.id,
        type: 'MENTOR_ASSIGNMENT'
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📋 ESTADO FINAL DE TODAS LAS NOTIFICACIONES:\n');
    todasNotif.forEach((n, i) => {
      console.log(`   ${i + 1}. ID ${n.id}: "${n.title}"`);
      console.log(`      Leída: ${n.isRead ? '✅ SÍ' : '❌ NO'}`);
      console.log(`      Creada: ${n.createdAt.toLocaleString('es-MX')}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PRUEBA COMPLETADA');
    console.log('   La notificación ahora está marcada como leída');
    console.log('   y no aparecerá en el banner del dashboard.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMarkNotificationsRead();
