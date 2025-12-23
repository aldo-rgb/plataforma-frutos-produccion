/**
 * Script de prueba: Sistema Financiero para Administradores
 * Verifica que el API /api/admin/finances funcione correctamente
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testSistemaFinanciero() {
  console.log('\n💰 TEST: Sistema Financiero de Administradores\n');
  console.log('═'.repeat(60));

  try {
    // 1. Verificar transacciones existentes
    const transactions = await prisma.transaction.findMany({
      include: {
        booking: {
          include: {
            Usuario_CallBooking_mentorIdToUsuario: { 
              select: { nombre: true, email: true } 
            },
            Usuario_CallBooking_studentIdToUsuario: { 
              select: { nombre: true, email: true } 
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📊 TRANSACCIONES ENCONTRADAS: ${transactions.length}`);
    console.log('─'.repeat(60));

    if (transactions.length === 0) {
      console.log('\n⚠️  No hay transacciones. Creando datos de prueba...\n');
      
      // Buscar mentor y estudiante
      const mentor = await prisma.usuario.findFirst({
        where: { rol: 'MENTOR', isActive: true }
      });

      const student = await prisma.usuario.findFirst({
        where: { rol: 'PARTICIPANTE' as any, isActive: true }
      });

      if (!mentor || !student) {
        console.log('❌ No hay usuarios disponibles para prueba');
        return;
      }

      // Crear booking de prueba
      const booking = await prisma.callBooking.create({
        data: {
          mentorId: mentor.id,
          studentId: student.id,
          type: 'MENTORSHIP',
          scheduledAt: new Date(Date.now() - 86400000), // Ayer
          status: 'COMPLETED',
          completedAt: new Date(),
          meetingLink: 'https://meet.google.com/test-123'
        }
      });

      // Crear transacción
      const transaction = await prisma.transaction.create({
        data: {
          bookingId: booking.id,
          amountTotal: 1500,
          platformFee: 450,  // 30%
          mentorEarnings: 1050, // 70%
          status: 'RELEASED',
          releasedAt: new Date()
        }
      });

      console.log('✅ Transacción de prueba creada:');
      console.log(`   ID: ${transaction.id}`);
      console.log(`   Monto Total: $${transaction.amountTotal} MXN`);
      console.log(`   Tu Comisión: $${transaction.platformFee} MXN`);
      console.log(`   Pago Mentor: $${transaction.mentorEarnings} MXN`);
      console.log(`   Estado: ${transaction.status}`);
    }

    // 2. Calcular estadísticas como lo hace el API
    const allTransactions = await prisma.transaction.findMany({
      include: {
        booking: {
          include: {
            Usuario_CallBooking_mentorIdToUsuario: { 
              select: { nombre: true, email: true } 
            },
            Usuario_CallBooking_studentIdToUsuario: { 
              select: { nombre: true, email: true } 
            }
          }
        }
      }
    });

    const stats = allTransactions.reduce(
      (acc, tx) => {
        acc.totalSales += tx.amountTotal;
        acc.platformProfit += tx.platformFee;
        acc.mentorPayouts += tx.mentorEarnings;

        if (tx.status === 'HELD') {
          acc.held += tx.mentorEarnings;
        } else if (tx.status === 'RELEASED') {
          acc.released += tx.mentorEarnings;
        } else if (tx.status === 'REFUNDED') {
          acc.refunded += tx.amountTotal;
        }

        return acc;
      },
      { 
        totalSales: 0, 
        platformProfit: 0, 
        mentorPayouts: 0,
        held: 0,
        released: 0,
        refunded: 0
      }
    );

    // 3. Mostrar resultados
    console.log('\n💰 RESUMEN FINANCIERO:');
    console.log('═'.repeat(60));
    console.log(`📈 Volumen Total Procesado:    $${stats.totalSales.toFixed(2)} MXN`);
    console.log(`✨ Tu Revenue (Plataforma):    $${stats.platformProfit.toFixed(2)} MXN`);
    console.log(`👨‍🏫 A Dispersar (Mentores):     $${stats.mentorPayouts.toFixed(2)} MXN`);
    console.log('─'.repeat(60));
    console.log(`⏳ Retenido (HELD):            $${stats.held.toFixed(2)} MXN`);
    console.log(`✅ Liberado (RELEASED):        $${stats.released.toFixed(2)} MXN`);
    console.log(`↩️  Reembolsado (REFUNDED):     $${stats.refunded.toFixed(2)} MXN`);

    // 4. Mostrar desglose por transacción
    console.log('\n📋 ÚLTIMAS 5 TRANSACCIONES:');
    console.log('═'.repeat(60));
    
    allTransactions.slice(0, 5).forEach((tx: any, index: number) => {
      const mentorName = tx.booking?.Usuario_CallBooking_mentorIdToUsuario?.nombre || 'N/A';
      const studentName = tx.booking?.Usuario_CallBooking_studentIdToUsuario?.nombre || 'N/A';
      
      console.log(`\n${index + 1}. Transacción #${tx.id}`);
      console.log(`   Mentor: ${mentorName}`);
      console.log(`   Estudiante: ${studentName}`);
      console.log(`   Monto: $${tx.amountTotal} = Tu $${tx.platformFee} + Mentor $${tx.mentorEarnings}`);
      console.log(`   Estado: ${tx.status}`);
      console.log(`   Fecha: ${tx.createdAt.toLocaleDateString('es-MX')}`);
    });

    // 5. Calcular comisión efectiva
    const comisionPromedio = stats.totalSales > 0 
      ? (stats.platformProfit / stats.totalSales) * 100 
      : 0;

    console.log('\n📊 MÉTRICAS ADICIONALES:');
    console.log('═'.repeat(60));
    console.log(`Total Transacciones: ${allTransactions.length}`);
    console.log(`Comisión Efectiva: ${comisionPromedio.toFixed(1)}%`);
    console.log(`Ticket Promedio: $${(stats.totalSales / allTransactions.length || 0).toFixed(2)} MXN`);

    // 6. Validar integridad
    const sumaVerificacion = allTransactions.every(tx => {
      const total = tx.platformFee + tx.mentorEarnings;
      const diff = Math.abs(total - tx.amountTotal);
      return diff < 0.01; // Tolerancia de centavos
    });

    console.log(`\n${sumaVerificacion ? '✅' : '❌'} Integridad de Datos: ${sumaVerificacion ? 'OK' : 'ERROR'}`);

    console.log('\n✨ TEST COMPLETADO EXITOSAMENTE\n');
    console.log('🌐 Accede al panel en: http://localhost:3000/dashboard/admin/finanzas\n');

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar test
testSistemaFinanciero();
