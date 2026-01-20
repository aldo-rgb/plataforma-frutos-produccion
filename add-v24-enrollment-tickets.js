const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VISION_ID = 5;
const ORG_ID = 3;
const PRICE = 6500;
const COORDINATOR_ID = 49; // Coordinador de Vision 24

// IDs de los usuarios ya creados (57-86)
const userIds = [57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86];

async function main() {
  console.log('=== Creando enrollments y tickets para Vision 24 ===\n');
  
  let enrollmentCreated = 0;
  let ticketCreated = 0;
  
  for (const userId of userIds) {
    try {
      // Verificar si ya tiene enrollment
      const existingEnrollment = await prisma.vision_enrollments.findFirst({
        where: { userId, visionId: VISION_ID }
      });
      
      if (!existingEnrollment) {
        await prisma.vision_enrollments.create({
          data: {
            userId,
            visionId: VISION_ID,
            coordinatorId: COORDINATOR_ID,
            level: 'BASIC',
            enrollmentStatus: 'ENROLLED',
            updatedAt: new Date()
          }
        });
        enrollmentCreated++;
        console.log('✅ Enrollment creado para user ID: ' + userId);
      } else {
        console.log('⚠️ Ya tiene enrollment user ID: ' + userId);
      }
      
      // Verificar si ya tiene ticket
      const existingTicket = await prisma.ticket.findFirst({
        where: { ownerId: userId, visionId: VISION_ID }
      });
      
      if (!existingTicket) {
        await prisma.ticket.create({
          data: {
            ownerId: userId,
            organizationId: ORG_ID,
            visionId: VISION_ID,
            level: 'BASIC',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            purchasePrice: PRICE
          }
        });
        ticketCreated++;
        console.log('✅ Ticket creado para user ID: ' + userId);
      } else {
        console.log('⚠️ Ya tiene ticket user ID: ' + userId);
      }
    } catch (error) {
      console.log('❌ Error user ID ' + userId + ': ' + error.message);
    }
  }
  
  console.log('\n=== RESUMEN ===');
  console.log('Enrollments creados: ' + enrollmentCreated);
  console.log('Tickets creados: ' + ticketCreated);
  
  await prisma.$disconnect();
}

main();
