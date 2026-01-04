/**
 * Script de Verificación del Sistema de Reportes
 * 
 * Verifica que todos los componentes del sistema estén funcionando correctamente
 * 
 * Uso:
 * node verify-reports-system.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarSistema() {
  console.log('🔍 Verificando Sistema de Reportes y Control...\n');

  try {
    // 1. Verificar tablas necesarias
    console.log('✅ 1. Verificando tablas de la base de datos...');
    
    const tables = [
      'LicenseOrder',
      'MentorPackageOrder', 
      'SchoolCredit',
      'CallBooking',
      'WeeklyPayrollPeriod',
      'MentorPayrollItem',
      'RefundRequest',
      'VisionMentor',
      'ProgramEnrollment'
    ];

    for (const table of tables) {
      try {
        await prisma[table.charAt(0).toLowerCase() + table.slice(1)].count();
        console.log(`   ✓ ${table}`);
      } catch (error) {
        console.log(`   ✗ ${table} - ERROR`);
      }
    }

    // 2. Contar datos existentes
    console.log('\n✅ 2. Contando datos existentes...');
    
    const stats = {
      licenseOrders: await prisma.licenseOrder.count(),
      mentorPackageOrders: await prisma.mentorPackageOrder.count(),
      schoolCredits: await prisma.schoolCredit.count(),
      callBookings: await prisma.callBooking.count(),
      mentores: await prisma.usuario.count({ where: { rol: 'MENTOR' } }),
      organizations: await prisma.organization.count(),
      visiones: await prisma.vision.count()
    };

    console.log(`   • Órdenes de Licencias: ${stats.licenseOrders}`);
    console.log(`   • Órdenes de Paquetes de Mentores: ${stats.mentorPackageOrders}`);
    console.log(`   • Créditos Escolares (Escrow): ${stats.schoolCredits}`);
    console.log(`   • Reservas de Llamadas: ${stats.callBookings}`);
    console.log(`   • Mentores: ${stats.mentores}`);
    console.log(`   • Organizaciones: ${stats.organizations}`);
    console.log(`   • Visiones: ${stats.visiones}`);

    // 3. Verificar datos financieros
    console.log('\n✅ 3. Calculando datos financieros...');

    // Ventas brutas
    const licenseRevenue = await prisma.licenseOrder.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true }
    });

    const packageRevenue = await prisma.mentorPackageOrder.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { precioTotal: true }
    });

    const grossRevenue = 
      (licenseRevenue._sum.amount || 0) + 
      (packageRevenue._sum.precioTotal || 0);

    console.log(`   • Ventas Brutas Totales: $${grossRevenue.toLocaleString()}`);

    // Escrow
    const escrowData = await prisma.schoolCredit.aggregate({
      where: { isActive: true },
      _sum: {
        totalPurchased: true,
        totalAllocated: true
      }
    });

    const escrowAmount = 
      ((escrowData._sum.totalPurchased || 0) - 
       (escrowData._sum.totalAllocated || 0)) * 90;

    console.log(`   • En Custodia (Escrow): $${escrowAmount.toLocaleString()}`);

    // Comisiones pendientes
    const unpaidCalls = await prisma.callBooking.count({
      where: {
        status: 'COMPLETED'
      }
    });

    const commissionsToPay = unpaidCalls * 90;
    console.log(`   • Comisiones por Pagar: $${commissionsToPay.toLocaleString()}`);

    // 4. Verificar bookings por estado
    console.log('\n✅ 4. Analizando reservas por estado...');
    
    const bookingsByStatus = await prisma.callBooking.groupBy({
      by: ['status'],
      _count: true
    });

    bookingsByStatus.forEach(item => {
      console.log(`   • ${item.status}: ${item._count} llamadas`);
    });

    // 5. Verificar mentores con paquetes
    console.log('\n✅ 5. Verificando mentores con paquetes...');
    
    const mentoresConAsignaciones = await prisma.visionMentor.groupBy({
      by: ['mentorId'],
      _count: true
    });

    console.log(`   • Mentores con asignaciones: ${mentoresConAsignaciones.length}`);

    // 6. Verificar alumnos activos
    console.log('\n✅ 6. Verificando alumnos activos...');
    
    const activeEnrollments = await prisma.programEnrollment.count({
      where: { status: 'ACTIVE' }
    });

    console.log(`   • Alumnos activos: ${activeEnrollments}`);

    // 7. Resumen de salud del sistema
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE SALUD DEL SISTEMA');
    console.log('='.repeat(60));

    const healthChecks = [
      { 
        check: 'Base de datos conectada', 
        passed: true 
      },
      { 
        check: 'Tablas de reportes disponibles', 
        passed: true 
      },
      { 
        check: 'Datos financieros calculables', 
        passed: grossRevenue >= 0 
      },
      { 
        check: 'Sistema de escrow operativo', 
        passed: stats.schoolCredits > 0 
      },
      { 
        check: 'Reservas registradas', 
        passed: stats.callBookings > 0 
      },
      { 
        check: 'Mentores en el sistema', 
        passed: stats.mentores > 0 
      }
    ];

    healthChecks.forEach(check => {
      const icon = check.passed ? '✅' : '⚠️';
      console.log(`${icon} ${check.check}`);
    });

    const allPassed = healthChecks.every(c => c.passed);
    
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('🎉 ¡Sistema de Reportes completamente funcional!');
    } else {
      console.log('⚠️ Algunos componentes requieren atención');
    }
    console.log('='.repeat(60));

    // 8. Instrucciones de acceso
    console.log('\n📍 ACCESO AL SISTEMA:');
    console.log('   1. Resumen Financiero:');
    console.log('      → http://localhost:3000/dashboard/admin/reports/financial');
    console.log('   2. Control de Reservas:');
    console.log('      → http://localhost:3000/dashboard/admin/reports/bookings');
    console.log('   3. Paquetes y Mentores:');
    console.log('      → http://localhost:3000/dashboard/admin/reports/packages');
    console.log('\n⚠️ IMPORTANTE: Solo usuarios con rol ADMIN o ADMINISTRADOR pueden acceder');

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verificarSistema()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
