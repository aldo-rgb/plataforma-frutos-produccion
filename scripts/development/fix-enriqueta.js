const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEnriqueta() {
  const userId = 139;
  const visionId = 7;
  
  // 1. Verificar/crear enrollment ADVANCED
  const existingAdvanced = await prisma.vision_enrollments.findFirst({
    where: { userId, visionId, level: 'ADVANCED' }
  });
  
  if (existingAdvanced) {
    console.log('Ya tiene ADVANCED enrollment:', existingAdvanced.id);
  } else {
    const basicEnrollment = await prisma.vision_enrollments.findFirst({
      where: { userId, visionId, level: 'BASIC' }
    });
    
    const newEnrollment = await prisma.vision_enrollments.create({
      data: {
        userId: userId,
        visionId: visionId,
        level: 'ADVANCED',
        enrollmentStatus: 'ENROLLED',
        paymentStatus: 'PAID',
        attendanceStatus: 'REGISTERED',
        enrolledAt: new Date(),
        updatedAt: new Date(),
        coordinatorId: basicEnrollment?.coordinatorId || null,
      }
    });
    console.log('✅ Enrollment ADVANCED creado:', newEnrollment.id);
  }
  
  // 2. Verificar/crear ticket ADVANCED
  const existingTicket = await prisma.ticket.findFirst({
    where: { ownerId: userId, visionId, level: 'ADVANCED' }
  });
  
  if (existingTicket) {
    console.log('Ya tiene ticket ADVANCED:', existingTicket.id);
  } else {
    const newTicket = await prisma.ticket.create({
      data: {
        ownerId: userId,
        visionId: visionId,
        organizationId: 4,
        level: 'ADVANCED',
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        purchasePrice: 9000,
        amountPaid: 9000,
        costAtPurchase: 9000,
        type: 'STANDARD',
      }
    });
    console.log('✅ Ticket ADVANCED creado:', newTicket.id);
  }
  
  // 3. Verificar/crear registro de pago
  const existingPayment = await prisma.payment.findFirst({
    where: { userId, visionId, level: 'ADVANCED' }
  });
  
  if (existingPayment) {
    console.log('Ya tiene payment:', existingPayment.id);
  } else {
    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        visionId: visionId,
        level: 'ADVANCED',
        amount: 9000,
        status: 'completed',
        paymentMethod: 'CASH_MANUAL',
        transactionId: 'CASH-BF34D8-9000',
      }
    });
    console.log('✅ Payment creado:', payment.id);
  }
  
  console.log('\n✅ ENRIQUETA ARREGLADA - YA TIENE ACCESO A AVANZADO');
  
  await prisma.$disconnect();
}

fixEnriqueta().catch(console.error);
