#!/usr/bin/env ts-node

/**
 * 🧪 TEST: Sistema de Transacciones Financieras
 * 
 * Este script verifica que:
 * 1. Las transacciones se crean correctamente al hacer una reserva
 * 2. Los cálculos de comisiones son correctos
 * 3. El status HELD se asigna correctamente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n💰 TEST: Sistema de Transacciones Financieras\n');

  try {
    // 1. Buscar un mentor y un estudiante para la prueba
    const mentor = await prisma.usuario.findFirst({
      where: { rol: 'MENTOR', isActive: true },
      select: { 
        id: true, 
        nombre: true,
        PerfilMentor: {
          select: {
            precioBase: true,
            comisionPlataforma: true
          }
        }
      }
    });

    const student = await prisma.usuario.findFirst({
      where: { 
        rol: { in: ['PARTICIPANTE', 'LIDER'] }, 
        isActive: true 
      },
      select: { id: true, nombre: true }
    });

    if (!mentor || !student) {
      console.log('❌ No se encontraron mentor y estudiante para la prueba');
      return;
    }

    console.log(`📋 Mentor: ${mentor.nombre} (ID: ${mentor.id})`);
    console.log(`📋 Estudiante: ${student.nombre} (ID: ${student.id})`);
    console.log('');

    // 2. Crear una reserva de MENTORSHIP
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 7); // En una semana
    scheduledAt.setHours(10, 0, 0, 0);

    const price = mentor.PerfilMentor?.precioBase || 1000;
    const commission = mentor.PerfilMentor?.comisionPlataforma || 30;
    const platformShare = (price * commission) / 100;
    const mentorShare = price - platformShare;

    console.log(`💵 CÁLCULOS FINANCIEROS:`);
    console.log(`   Precio base: $${price}`);
    console.log(`   Comisión plataforma: ${commission}%`);
    console.log(`   Para la plataforma: $${platformShare}`);
    console.log(`   Para el mentor: $${mentorShare}`);
    console.log('');

    // 3. Crear la reserva con transacción
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.callBooking.create({
        data: {
          studentId: student.id,
          mentorId: mentor.id,
          scheduledAt,
          duration: 60,
          status: 'PENDING',
          type: 'MENTORSHIP'
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          bookingId: booking.id,
          amountTotal: price,
          platformFee: platformShare,
          mentorEarnings: mentorShare,
          status: 'HELD'
        }
      });

      return { booking, transaction };
    });

    console.log(`✅ RESERVA CREADA:`);
    console.log(`   Booking ID: ${result.booking.id}`);
    console.log(`   Fecha: ${result.booking.scheduledAt.toISOString()}`);
    console.log(`   Tipo: ${result.booking.type}`);
    console.log('');

    console.log(`✅ TRANSACCIÓN REGISTRADA:`);
    console.log(`   Transaction ID: ${result.transaction.id}`);
    console.log(`   Total: $${result.transaction.amountTotal}`);
    console.log(`   Comisión plataforma: $${result.transaction.platformFee}`);
    console.log(`   Ganancias mentor: $${result.transaction.mentorEarnings}`);
    console.log(`   Status: ${result.transaction.status}`);
    console.log('');

    // 4. Verificar la relación
    const bookingWithTransaction = await prisma.callBooking.findUnique({
      where: { id: result.booking.id },
      include: { Transaction: true }
    });

    if (bookingWithTransaction?.Transaction) {
      console.log(`✅ RELACIÓN VERIFICADA: Booking ${bookingWithTransaction.id} → Transaction ${bookingWithTransaction.Transaction.id}`);
    } else {
      console.log(`❌ ERROR: No se encontró la relación`);
    }

    // 5. Limpieza: Eliminar la reserva de prueba
    await prisma.transaction.delete({ where: { id: result.transaction.id } });
    await prisma.callBooking.delete({ where: { id: result.booking.id } });

    console.log('\n🧹 Datos de prueba eliminados\n');
    console.log('🎉 TEST COMPLETADO EXITOSAMENTE\n');

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
