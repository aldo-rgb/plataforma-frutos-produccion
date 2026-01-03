const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser59Payment() {
  try {
    console.log('🔍 Verificando estado del pago del usuario 59...\n');
    
    const user = await prisma.usuario.findUnique({
      where: { id: 59 },
      select: {
        id: true,
        nombre: true,
        email: true,
        subscriptionStatus: true,
        assignedMentorId: true
      }
    });
    
    console.log('👤 Usuario:', user.nombre);
    console.log('   Email:', user.email);
    console.log('   Subscription Status:', user.subscriptionStatus);
    console.log('   Assigned Mentor ID:', user.assignedMentorId);
    
    // Buscar órdenes de paquetes
    console.log('\n📦 Órdenes de MentorPackage:');
    const orders = await prisma.mentorPackageOrder.findMany({
      where: { usuarioId: 59 },
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (orders.length > 0) {
      orders.forEach((order, idx) => {
        console.log(`\n   Orden #${idx + 1}:`);
        console.log('      ID:', order.id);
        console.log('      Status:', order.status);
        console.log('      Amount:', order.amount);
        console.log('      Mentor:', order.Mentor?.nombre);
        console.log('      Created:', order.createdAt);
        console.log('      Updated:', order.updatedAt);
      });
    } else {
      console.log('   ❌ No hay órdenes de paquetes');
    }
    
    // Buscar créditos de sesiones
    console.log('\n💳 Créditos de Sesiones (PackageSessionCredits):');
    const orderIds = orders.filter(o => o.status === 'COMPLETED').map(o => o.id);
    const credits = await prisma.packageSessionCredits.findMany({
      where: { 
        packageOrderId: { in: orderIds }
      },
      include: {
        MentorPackageOrder: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (credits.length > 0) {
      credits.forEach((credit, idx) => {
        console.log(`\n   Crédito #${idx + 1}:`);
        console.log('      ID:', credit.id);
        console.log('      Total Sessions:', credit.totalSessions);
        console.log('      Used Sessions:', credit.usedSessions);
        console.log('      Remaining:', credit.totalSessions - credit.usedSessions);
        console.log('      Order ID:', credit.orderId);
        console.log('      Expires At:', credit.expiresAt);
        console.log('      Created:', credit.createdAt);
      });
    } else {
      console.log('   ❌ No hay créditos de sesiones');
    }
    
    // Buscar carta de frutos
    console.log('\n📄 Carta de Frutos:');
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: 59 },
      orderBy: { fechaCreacion: 'desc' }
    });
    
    if (carta) {
      console.log('   ID:', carta.id);
      console.log('   Estado:', carta.estado);
      console.log('   Assigned Mentor ID:', carta.assignedMentorId);
      console.log('   Fecha Creación:', carta.fechaCreacion);
      console.log('   Fecha Actualización:', carta.fechaActualizacion);
    } else {
      console.log('   ❌ No tiene carta de frutos');
    }
    
    // Buscar comisiones
    console.log('\n💰 Ledger de Comisiones:');
    const ledgers = await prisma.commissionLedger.findMany({
      where: {
        OR: [
          { mentorId: user.assignedMentorId || 0 },
          { orderId: orders[0]?.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (ledgers.length > 0) {
      ledgers.forEach((ledger, idx) => {
        console.log(`\n   Comisión #${idx + 1}:`);
        console.log('      ID:', ledger.id);
        console.log('      Type:', ledger.type);
        console.log('      Amount:', ledger.amount);
        console.log('      Status:', ledger.status);
        console.log('      Order ID:', ledger.orderId);
        console.log('      Created:', ledger.createdAt);
      });
    } else {
      console.log('   ❌ No hay comisiones registradas');
    }
    
    console.log('\n✅ Verificación completa');
    
    // Resumen del estado
    console.log('\n📊 RESUMEN:');
    console.log('═══════════════════════════════════════');
    const lastOrder = orders[0];
    const hasActiveCredits = credits.some(c => (c.totalSessions - c.usedSessions) > 0);
    
    if (lastOrder && lastOrder.status === 'COMPLETED') {
      console.log('✅ Pago procesado correctamente');
      console.log('✅ Orden completada:', lastOrder.id);
      
      if (hasActiveCredits) {
        console.log('✅ Créditos de sesiones creados');
      } else {
        console.log('⚠️  No hay créditos activos');
      }
      
      if (user.assignedMentorId) {
        console.log('✅ Mentor asignado:', user.assignedMentorId);
      } else {
        console.log('⚠️  No hay mentor asignado en el usuario');
      }
      
      if (carta) {
        console.log(`📄 Carta en estado: ${carta.estado}`);
        if (carta.estado === 'APROBADA') {
          console.log('   ℹ️  Debería estar en EN_REVISION después del pago');
        }
      } else {
        console.log('⚠️  No tiene carta de frutos (debe crear una)');
      }
    } else if (lastOrder && lastOrder.status === 'PENDING') {
      console.log('⚠️  Orden pendiente de pago:', lastOrder.id);
    } else {
      console.log('❌ No hay órdenes completadas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser59Payment();
