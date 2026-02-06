/**
 * Script para sincronizar enrollments faltantes
 * Encuentra usuarios que tienen tickets de ADVANCED/PL pero no tienen los enrollments correspondientes
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando usuarios con tickets pero sin enrollments...\n');
  
  // Buscar todos los tickets ADVANCED activos
  const advancedTickets = await prisma.ticket.findMany({
    where: {
      level: 'ADVANCED',
      status: 'ACTIVE'
    },
    include: {
      owner: { select: { id: true, nombre: true, email: true } },
      vision: { select: { id: true, nombre: true, coordinadorId: true } }
    }
  });
  
  // Buscar todos los tickets PL activos
  const plTickets = await prisma.ticket.findMany({
    where: {
      level: 'PL',
      status: 'ACTIVE'
    },
    include: {
      owner: { select: { id: true, nombre: true, email: true } },
      vision: { select: { id: true, nombre: true, coordinadorId: true } }
    }
  });
  
  console.log(`📊 Encontrados ${advancedTickets.length} tickets ADVANCED y ${plTickets.length} tickets PL\n`);
  
  const missingEnrollments = [];
  
  // Verificar tickets ADVANCED
  for (const ticket of advancedTickets) {
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: ticket.ownerId,
        visionId: ticket.visionId,
        level: 'ADVANCED'
      }
    });
    
    if (!enrollment) {
      missingEnrollments.push({
        userId: ticket.ownerId,
        userName: ticket.owner.nombre,
        userEmail: ticket.owner.email,
        visionId: ticket.visionId,
        visionName: ticket.vision?.nombre,
        coordinatorId: ticket.vision?.coordinadorId,
        level: 'ADVANCED',
        ticketId: ticket.id
      });
    }
  }
  
  // Verificar tickets PL
  for (const ticket of plTickets) {
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: ticket.ownerId,
        visionId: ticket.visionId,
        level: 'PL'
      }
    });
    
    if (!enrollment) {
      missingEnrollments.push({
        userId: ticket.ownerId,
        userName: ticket.owner.nombre,
        userEmail: ticket.owner.email,
        visionId: ticket.visionId,
        visionName: ticket.vision?.nombre,
        coordinatorId: ticket.vision?.coordinadorId,
        level: 'PL',
        ticketId: ticket.id
      });
    }
  }
  
  if (missingEnrollments.length === 0) {
    console.log('✅ No hay enrollments faltantes. Todo está sincronizado.');
    return;
  }
  
  console.log(`\n⚠️ Encontrados ${missingEnrollments.length} enrollments faltantes:\n`);
  
  for (const missing of missingEnrollments) {
    console.log(`  ❌ ${missing.userName} (${missing.userEmail})`);
    console.log(`     - Visión: ${missing.visionId} - ${missing.visionName}`);
    console.log(`     - Level: ${missing.level}`);
    console.log(`     - Ticket ID: ${missing.ticketId}\n`);
  }
  
  // Preguntar si se deben crear
  const args = process.argv.slice(2);
  if (args.includes('--fix')) {
    console.log('\n🔧 Creando enrollments faltantes...\n');
    
    for (const missing of missingEnrollments) {
      try {
        await prisma.vision_enrollments.create({
          data: {
            userId: missing.userId,
            visionId: missing.visionId,
            coordinatorId: missing.coordinatorId,
            level: missing.level,
            enrollmentStatus: 'ENROLLED',
            paymentStatus: 'PAID',
            updatedAt: new Date()
          }
        });
        console.log(`  ✅ Creado enrollment ${missing.level} para ${missing.userEmail}`);
      } catch (error) {
        console.error(`  ❌ Error creando enrollment para ${missing.userEmail}:`, error.message);
      }
    }
    
    console.log('\n✅ Proceso completado.');
  } else {
    console.log('\n💡 Para crear los enrollments faltantes, ejecuta:');
    console.log('   node sync-enrollments.js --fix\n');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
