const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function convertCreditsToPendingOrder() {
  try {
    console.log('🔄 Convirtiendo créditos de Centro 1 en orden pendiente...\n');

    // 1. Buscar Centro 1
    const centro1 = await prisma.organization.findFirst({
      where: { name: { contains: 'Centro 1' } }
    });

    if (!centro1) {
      console.error('❌ No se encontró Centro 1');
      return;
    }

    console.log('✅ Centro 1 encontrado:', centro1.name);

    // 3. Buscar al director (SCHOOL_ADMIN) de Centro 1
    const director = await prisma.usuario.findFirst({
      where: {
        organizationId: centro1.id,
        rol: 'SCHOOL_ADMIN'
      }
    });

    if (!director) {
      console.error('❌ No se encontró director de Centro 1');
      return;
    }

    console.log('👤 Director encontrado:', director.nombre);

    // 4. Obtener los créditos actuales
    const credits = await prisma.schoolCredit.findMany({
      where: { organizationId: centro1.id }
    });

    if (credits.length === 0) {
      console.log('⚠️  No hay créditos para convertir');
      return;
    }

    console.log('📊 Créditos encontrados:', credits.length);
    credits.forEach(c => {
      console.log(`  - ${c.totalPurchased} licencias ${c.planType} ($${c.unitPrice} c/u)`);
    });

    // 3. Crear orden pendiente por cada grupo de créditos
    for (const credit of credits) {
      // Verificar si ya existe una orden para estos créditos
      const existingOrder = await prisma.licenseOrder.findFirst({
        where: {
          organizationId: centro1.id,
          quantity: credit.totalPurchased,
          tier: credit.planType,
          status: 'PENDING'
        }
      });

      if (existingOrder) {
        console.log(`⚠️  Ya existe una orden pendiente para ${credit.totalPurchased} licencias ${credit.planType}`);
        continue;
      }

      // Crear la orden pendiente
      const order = await prisma.licenseOrder.create({
        data: {
          organizationId: centro1.id,
          requestedBy: director.id,
          quantity: credit.totalPurchased,
          tier: credit.planType,
          amount: credit.totalPaid,
          status: 'PENDING',
          paymentMethod: 'TRANSFER', // Transferencia bancaria
          paymentUrl: null, // Se generará cuando procesen el pago
          createdAt: new Date()
        }
      });

      console.log(`✅ Orden pendiente creada: ID ${order.id}`);
      console.log(`   Cantidad: ${order.quantity} licencias ${order.tier}`);
      console.log(`   Monto: $${order.amount} MXN`);

      // 4. Desactivar los créditos temporalmente hasta que se pague
      await prisma.schoolCredit.update({
        where: { id: credit.id },
        data: { 
          isActive: false,
          notes: 'Pendiente de pago - Orden creada'
        }
      });

      console.log(`🔒 Créditos desactivados (se activarán al confirmar pago)\n`);
    }

    // 5. Mostrar resumen
    const pendingOrders = await prisma.licenseOrder.findMany({
      where: {
        organizationId: centro1.id,
        status: 'PENDING'
      }
    });

    console.log('📋 RESUMEN:');
    console.log(`   Total de órdenes pendientes: ${pendingOrders.length}`);
    pendingOrders.forEach(order => {
      console.log(`   - Orden #${order.id}: ${order.quantity} licencias ${order.tier} - $${order.amount} MXN`);
    });
    console.log('\n💡 El director debe ir al dashboard y completar el pago para activar las licencias');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertCreditsToPendingOrder();
