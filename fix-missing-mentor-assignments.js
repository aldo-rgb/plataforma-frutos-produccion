const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingMentorAssignments() {
  console.log('🔧 Reparando asignaciones de mentores faltantes...\n');

  // Encontrar todas las órdenes COMPLETED de tipo VISION_MENTOR_PAYMENT
  const visionOrders = await prisma.licenseOrder.findMany({
    where: {
      status: 'COMPLETED',
    },
  });

  console.log(`📊 Total órdenes COMPLETED encontradas: ${visionOrders.length}\n`);

  let processedOrders = 0;
  let createdPackages = 0;
  let createdVisionMentors = 0;

  for (const order of visionOrders) {
    const paymentData = order.paymentData;
    
    // Verificar si es pago de visión
    if (paymentData?.type !== 'VISION_MENTOR_PAYMENT') {
      continue;
    }

    const visionId = paymentData.visionId;
    const mentorAssignments = paymentData.mentorAssignments || [];

    if (mentorAssignments.length === 0) {
      console.log(`⚠️  Orden ${order.id} no tiene mentorAssignments`);
      continue;
    }

    console.log(`\n🎯 Procesando orden ${order.id} - Visión ${visionId}`);
    console.log(`   Mentores a asignar: ${mentorAssignments.length}`);

    for (const assignment of mentorAssignments) {
      const { mentorId, studentCount, ratePerCall, mentorName } = assignment;
      const totalSessions = studentCount * 18;
      const totalCost = totalSessions * ratePerCall;

      // Verificar si ya existe MentorPackageOrder
      const existingPackage = await prisma.mentorPackageOrder.findFirst({
        where: {
          mentorId: mentorId,
          visionId: visionId,
          organizationId: order.organizationId,
          precioUnitario: ratePerCall,
        },
      });

      if (existingPackage) {
        console.log(`   ℹ️  MentorPackageOrder ya existe para mentor ${mentorName} (ID: ${mentorId})`);
      } else {
        // Crear MentorPackageOrder
        const packageOrder = await prisma.mentorPackageOrder.create({
          data: {
            usuarioId: order.requestedBy,
            mentorId: mentorId,
            visionId: visionId,
            organizationId: order.organizationId,
            cantidad: totalSessions,
            precioUnitario: ratePerCall,
            precioTotal: totalCost,
            currency: 'MXN',
            metodoPago: order.paymentMethod || 'paypal',
            status: 'COMPLETED',
            externalPaymentId: order.externalPaymentId || `PAYPAL-${order.id}`,
            paidAt: order.paidAt || new Date(),
            createdAt: order.createdAt, // Usar fecha original
          },
        });

        console.log(`   ✅ MentorPackageOrder creado: ${packageOrder.id} - ${mentorName} (${totalSessions} sesiones)`);
        createdPackages++;
      }

      // Verificar si ya existe VisionMentor
      const existingVisionMentor = await prisma.visionMentor.findFirst({
        where: {
          visionId: visionId,
          mentorId: mentorId,
        },
      });

      if (existingVisionMentor) {
        console.log(`   ℹ️  VisionMentor ya existe para mentor ${mentorName} (ID: ${mentorId})`);
      } else {
        // Crear VisionMentor
        await prisma.visionMentor.create({
          data: {
            visionId: visionId,
            mentorId: mentorId,
            asignadoPorId: order.requestedBy,
            createdAt: order.createdAt, // Usar fecha original
          },
        });

        console.log(`   ✅ VisionMentor creado para mentor ${mentorName} (ID: ${mentorId})`);
        createdVisionMentors++;
      }
    }

    processedOrders++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Reparación completada:`);
  console.log(`   📋 Órdenes procesadas: ${processedOrders}`);
  console.log(`   📦 MentorPackageOrders creados: ${createdPackages}`);
  console.log(`   🔗 VisionMentors creados: ${createdVisionMentors}`);
  console.log(`${'='.repeat(60)}\n`);

  await prisma.$disconnect();
}

fixMissingMentorAssignments()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
