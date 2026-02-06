const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCallBlockingSystem() {
  try {
    console.log('\n🧪 PRUEBA DEL SISTEMA DE BLOQUEO DE LLAMADAS\n');
    console.log('================================================\n');

    const organizationId = 14;

    // 1. Verificar estado de SchoolCredit
    console.log('1️⃣ ESTADO DE SCHOOLCREDIT:');
    const schoolCredit = await prisma.schoolCredit.findFirst({
      where: {
        organizationId: organizationId,
        isActive: true,
      },
    });

    if (schoolCredit) {
      console.log(`  📊 Total Comprado: ${schoolCredit.totalPurchased} llamadas`);
      console.log(`  🔒 Total Bloqueado: ${schoolCredit.totalAllocated} llamadas`);
      console.log(`  💰 Disponible: ${schoolCredit.totalPurchased - schoolCredit.totalAllocated} llamadas`);
      console.log(`  💵 Total Pagado: $${schoolCredit.totalPaid}`);
    } else {
      console.log('  ❌ No hay SchoolCredit activo');
    }

    // 2. Verificar paquetes de mentores
    console.log('\n2️⃣ PAQUETES DE MENTORES:');
    const packages = await prisma.mentorPackageOrder.findMany({
      where: {
        organizationId: organizationId,
        status: 'COMPLETED',
      },
      include: {
        PackageSessionCredits: true,
        Mentor: {
          select: { nombre: true },
        },
        Vision: {
          select: { nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (packages.length > 0) {
      packages.forEach((pkg, index) => {
        console.log(`\n  📦 Paquete ${index + 1}:`);
        console.log(`    Mentor: ${pkg.Mentor.nombre}`);
        console.log(`    Visión: ${pkg.Vision.nombre}`);
        console.log(`    Estudiantes: ${pkg.cantidad}`);
        console.log(`    Precio Total: $${pkg.precioTotal}`);
        
        if (pkg.PackageSessionCredits) {
          const credits = pkg.PackageSessionCredits;
          console.log(`    💳 Sesiones:`);
          console.log(`      Total: ${credits.totalSessions}`);
          console.log(`      Usadas: ${credits.usedSessions}`);
          console.log(`      Restantes: ${credits.remainingSessions}`);
          console.log(`      Activo: ${credits.isActive ? '✅' : '❌'}`);
        }
      });
    } else {
      console.log('  ℹ️ No hay paquetes completados');
    }

    // 3. Verificar CallBookings asociados a paquetes
    console.log('\n3️⃣ SESIONES COMPLETADAS:');
    const completedSessions = await prisma.callBooking.count({
      where: {
        packageOrderId: { not: null },
        status: 'COMPLETED',
      },
    });

    const pendingSessions = await prisma.callBooking.count({
      where: {
        packageOrderId: { not: null },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    console.log(`  ✅ Sesiones Completadas: ${completedSessions}`);
    console.log(`  📅 Sesiones Pendientes: ${pendingSessions}`);

    // 4. Resumen del sistema
    console.log('\n4️⃣ RESUMEN DEL SISTEMA:');
    if (schoolCredit && packages.length > 0) {
      const totalSessions = packages.reduce((sum, pkg) => {
        return sum + (pkg.PackageSessionCredits?.totalSessions || 0);
      }, 0);

      const usedSessions = packages.reduce((sum, pkg) => {
        return sum + (pkg.PackageSessionCredits?.usedSessions || 0);
      }, 0);

      const remainingSessions = packages.reduce((sum, pkg) => {
        return sum + (pkg.PackageSessionCredits?.remainingSessions || 0);
      }, 0);

      console.log(`  📊 Sesiones Totales en Paquetes: ${totalSessions}`);
      console.log(`  ✅ Sesiones Consumidas: ${usedSessions}`);
      console.log(`  💰 Sesiones Restantes: ${remainingSessions}`);
      console.log(`  🔒 Sesiones Bloqueadas (totalAllocated): ${schoolCredit.totalAllocated}`);
      
      console.log('\n5️⃣ VALIDACIÓN:');
      if (totalSessions === schoolCredit.totalAllocated) {
        console.log('  ✅ CORRECTO: totalAllocated coincide con sesiones en paquetes');
      } else {
        console.log('  ⚠️ ADVERTENCIA: Discrepancia detectada');
        console.log(`     totalAllocated: ${schoolCredit.totalAllocated}`);
        console.log(`     Sesiones en paquetes: ${totalSessions}`);
      }
    }

    console.log('\n================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCallBlockingSystem();
