const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPLForLuis() {
  const userId = 35; // Luis Quintana
  const visionId = 3; // V2 GDL
  
  try {
    // Obtener datos necesarios
    const advancedEnrollment = await prisma.vision_enrollments.findFirst({
      where: { userId, visionId, level: 'ADVANCED' }
    });
    
    if (!advancedEnrollment) {
      console.log('❌ No tiene enrollment de ADVANCED en esta visión');
      return;
    }
    
    console.log('✅ Enrollment ADVANCED encontrado:', advancedEnrollment.id);
    
    // Obtener visión para las fechas
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { 
        id: true, 
        organizationId: true,
        plWeekend3EndDate: true 
      }
    });
    
    console.log('Visión:', vision);
    
    // Verificar que no existe PL
    const existingPL = await prisma.vision_enrollments.findFirst({
      where: { userId, visionId, level: 'PL' }
    });
    
    if (existingPL) {
      console.log('⚠️ Ya existe enrollment de PL');
      return;
    }
    
    // Crear enrollment y ticket de PL
    const result = await prisma.$transaction(async (tx) => {
      // Crear enrollment PL
      const plEnrollment = await tx.vision_enrollments.create({
        data: {
          userId: userId,
          visionId: visionId,
          coordinatorId: advancedEnrollment.coordinatorId,
          level: 'PL',
          enrollmentStatus: 'ACTIVE',
          paymentStatus: 'PAID',
          enrolledAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('✅ Enrollment PL creado:', plEnrollment.id);
      
      // Crear ticket PL
      const plTicket = await tx.ticket.create({
        data: {
          ownerId: userId,
          organizationId: vision.organizationId,
          visionId: visionId,
          level: 'PL',
          type: 'STANDARD',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          costAtPurchase: 11000,
          amountPaid: 11000,
          isTransferable: false,
          validUntil: vision.plWeekend3EndDate,
        },
      });
      console.log('✅ Ticket PL creado:', plTicket.id);
      
      // Actualizar nivel del usuario
      await tx.usuario.update({
        where: { id: userId },
        data: { currentVisionLevel: 'PL' }
      });
      console.log('✅ Usuario actualizado a nivel PL');
      
      return { plEnrollment, plTicket };
    });
    
    console.log('\n🎉 ¡Listo! Luis Quintana ahora tiene acceso a Tu Vida (PL)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPLForLuis();
