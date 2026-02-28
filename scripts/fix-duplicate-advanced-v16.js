/**
 * Script para corregir tickets y enrollments duplicados de ADVANCED en Vision 16
 * 
 * Estos usuarios ya completaron ADVANCED en Vision 13 (ATTENDED) pero por un bug
 * se les creó erróneamente tickets y enrollments ADVANCED en Vision 16.
 * 
 * Este script:
 * 1. Elimina los tickets ADVANCED de Vision 16 para estos usuarios
 * 2. Elimina los enrollments ADVANCED de Vision 16 para estos usuarios
 * 3. Elimina los pagos asociados del 22 de febrero
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AFFECTED_USERS = [
  { id: 959, nombre: 'Dahirte Ahulos velasco' },
  { id: 206, nombre: 'HugoAquino Jose' },
  { id: 285, nombre: 'Stephania Citlalli Peña Cruz' },
  { id: 204, nombre: 'Edith Melchor Blas' },
  { id: 169, nombre: 'EmmaCastellanos Delgado' },
  { id: 187, nombre: 'Geovani Gallardo Hernández' },
  { id: 186, nombre: 'Ana Edith Tomas Ramirez' },
  { id: 170, nombre: 'Griselda GuadalupeAlafita Calvo' },
  { id: 173, nombre: 'GabrielaCarrasco Arellanes' },
];

async function main() {
  console.log('🔧 Iniciando corrección de tickets duplicados ADVANCED en Vision 16...\n');

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('⚠️  MODO DRY-RUN: No se harán cambios reales\n');
  }

  for (const user of AFFECTED_USERS) {
    console.log(`\n📋 Procesando: ${user.nombre} (ID: ${user.id})`);

    // 1. Buscar ticket ADVANCED en Vision 16
    const ticketV16 = await prisma.ticket.findFirst({
      where: {
        ownerId: user.id,
        visionId: 16,
        level: 'ADVANCED'
      }
    });

    if (ticketV16) {
      console.log(`   🎫 Ticket encontrado: ${ticketV16.id}`);
      console.log(`      - Pagado: $${ticketV16.amountPaid}`);
      console.log(`      - Status: ${ticketV16.paymentStatus}`);
      console.log(`      - Creado: ${ticketV16.createdAt}`);

      if (!dryRun) {
        // Eliminar transacciones del ticket primero
        await prisma.ticketTransaction.deleteMany({
          where: { ticketId: ticketV16.id }
        });
        
        // Eliminar el ticket
        await prisma.ticket.delete({
          where: { id: ticketV16.id }
        });
        console.log(`   ✅ Ticket eliminado`);
      }
    } else {
      console.log(`   ℹ️  No tiene ticket ADVANCED en Vision 16`);
    }

    // 2. Buscar enrollment ADVANCED en Vision 16
    const enrollmentV16 = await prisma.vision_enrollments.findFirst({
      where: {
        userId: user.id,
        visionId: 16,
        level: 'ADVANCED'
      }
    });

    if (enrollmentV16) {
      console.log(`   📝 Enrollment encontrado: ${enrollmentV16.id}`);
      console.log(`      - Status: ${enrollmentV16.enrollmentStatus}`);
      console.log(`      - Creado: ${enrollmentV16.createdAt}`);

      if (!dryRun) {
        await prisma.vision_enrollments.delete({
          where: { id: enrollmentV16.id }
        });
        console.log(`   ✅ Enrollment eliminado`);
      }
    } else {
      console.log(`   ℹ️  No tiene enrollment ADVANCED en Vision 16`);
    }

    // 3. Buscar pagos del 22 de febrero
    const startDate = new Date('2026-02-22T00:00:00Z');
    const endDate = new Date('2026-02-22T23:59:59Z');
    
    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        paymentMethod: 'CASH'
      }
    });

    if (payments.length > 0) {
      console.log(`   💰 Pagos del 22/Feb encontrados: ${payments.length}`);
      for (const p of payments) {
        console.log(`      - ID: ${p.id}, Monto: $${p.amount}, Ref: ${p.transactionId}`);
        
        if (!dryRun) {
          await prisma.payment.delete({
            where: { id: p.id }
          });
          console.log(`      ✅ Pago ${p.id} eliminado`);
        }
      }
    }

    // Verificar si tiene Vision 13 ATTENDED (confirmación)
    const v13Attended = await prisma.vision_enrollments.findFirst({
      where: {
        userId: user.id,
        visionId: 13,
        level: 'ADVANCED',
        attendanceStatus: 'ATTENDED'
      }
    });

    if (v13Attended) {
      console.log(`   ✅ Confirmado: Tiene ADVANCED ATTENDED en Vision 13`);
    }
  }

  console.log('\n\n========================================');
  if (dryRun) {
    console.log('✅ DRY-RUN completado. Ejecuta sin --dry-run para aplicar cambios.');
  } else {
    console.log('✅ Corrección completada.');
  }
  console.log('========================================\n');

  // Mostrar resumen final
  console.log('\n📊 Estado actual de los usuarios afectados:');
  for (const user of AFFECTED_USERS) {
    const ticketsV16 = await prisma.ticket.count({
      where: { ownerId: user.id, visionId: 16, level: 'ADVANCED' }
    });
    const enrollmentsV16 = await prisma.vision_enrollments.count({
      where: { userId: user.id, visionId: 16, level: 'ADVANCED' }
    });
    
    const status = (ticketsV16 === 0 && enrollmentsV16 === 0) ? '✅' : '❌';
    console.log(`   ${status} ${user.nombre}: Tickets V16=${ticketsV16}, Enrollments V16=${enrollmentsV16}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
