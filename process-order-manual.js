const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function processOrder() {
  const orderId = 5; // La orden actual
  
  try {
    console.log(`Procesando orden ${orderId}...`);
    
    const order = await prisma.institutionalOrder.findUnique({
      where: { id: orderId },
      include: {
        Usuario: true,
      }
    });

    if (!order) {
      console.error('❌ Orden no encontrada');
      return;
    }

    if (order.status === 'COMPLETED') {
      console.log('✅ La orden ya fue procesada');
      return;
    }

    console.log(`Orden encontrada: ${order.nombreOrganizacion}`);
    console.log(`Usuario: ${order.Usuario.email}`);
    console.log(`Licencias: ${order.cantidadLicencias}`);

    // Procesar en transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear organización
      const organization = await tx.organization.create({
        data: {
          name: order.nombreOrganizacion,
          slug: order.nombreOrganizacion.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          logoUrl: order.logoUrl || '',
          brandColor: '#9333ea',
          contactEmail: order.Usuario.email,
          status: 'ACTIVE',
          isGeofenced: !!order.geofencing,
          geofenceRadius: order.geofencing ? 1000 : 100,
          schoolAdminId: order.userId,
          totalLicenses: order.cantidadLicencias,
          activeLicenses: order.cantidadLicencias,
          updatedAt: new Date(),
        }
      });

      console.log(`✅ Organización creada: ${organization.id}`);

      // 2. Actualizar usuario a SCHOOL_ADMIN (Director)
      await tx.usuario.update({
        where: { id: order.userId },
        data: {
          rol: 'SCHOOL_ADMIN',
          subscriptionPlan: 'SCHOOL_LICENSE',
          organizationId: organization.id,
        }
      });

      console.log(`✅ Usuario actualizado a SCHOOL_ADMIN (Director)`);

      // 3. Crear licencias
      const licenses = [];
      for (let i = 0; i < order.cantidadLicencias; i++) {
        const prefix = 'STD';
        const timestamp = Date.now().toString(36).toUpperCase();
        const orgCode = organization.id.toString(36).toUpperCase().padStart(4, '0');
        const indexCode = (i + 1).toString(36).toUpperCase().padStart(4, '0');
        const licenseCode = `${prefix}-${orgCode}-${timestamp}-${indexCode}`;

        licenses.push({
          organizationId: organization.id,
          code: licenseCode,
          isActive: true,
          maxUses: 1,
          updatedAt: new Date(),
        });
      }

      await tx.license.createMany({
        data: licenses,
      });

      console.log(`✅ ${order.cantidadLicencias} licencias creadas`);

      // 4. Actualizar orden
      await tx.institutionalOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          paymentId: 'simulated-payment',
          processedAt: new Date(),
          organizationId: organization.id,
        }
      });

      console.log(`✅ Orden marcada como completada`);

      // 5. Registrar pago
      await tx.payment.create({
        data: {
          userId: order.userId,
          organizationId: organization.id,
          amount: order.totalAmount,
          currency: 'MXN',
          status: 'COMPLETED',
          paymentMethod: order.paymentMethod,
          paymentId: 'simulated-payment',
          description: `Plan Institucional - ${order.nombreOrganizacion} - ${order.cantidadLicencias} licencias`,
          metadata: {
            orderId: order.id,
            cantidadLicencias: order.cantidadLicencias,
          },
          isSchoolPayment: true,
          updatedAt: new Date(),
        }
      });

      console.log(`✅ Pago registrado`);

      return { organization };
    });

    console.log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE');
    console.log(`Organización ID: ${result.organization.id}`);
    console.log(`Nombre: ${result.organization.name}`);
    console.log(`Director: ${order.Usuario.email}`);
    console.log(`Licencias: ${order.cantidadLicencias}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

processOrder();
