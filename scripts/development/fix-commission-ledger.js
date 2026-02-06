const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para limpiar comisiones anticipadas incorrectas
 * 
 * Problema: Se crearon comisiones de $1,399 al momento de compra del paquete
 * Solución: Eliminar esas entradas porque las comisiones deben registrarse
 *           por cada sesión completada ($90 por sesión)
 */

async function fixCommissionLedger() {
  try {
    console.log('🔍 Buscando comisiones anticipadas de paquetes...\n');

    // Buscar todas las comisiones de tipo PACKAGE_SESSION
    const packageCommissions = await prisma.commissionLedger.findMany({
      where: {
        sourceType: 'PACKAGE_SESSION'
      },
      include: {
        Mentor: { select: { nombre: true } },
        Student: { select: { nombre: true } }
      }
    });

    console.log(`📦 Encontradas ${packageCommissions.length} comisiones de paquetes:\n`);

    packageCommissions.forEach(comm => {
      console.log(`   ID: ${comm.id}`);
      console.log(`   Mentor: ${comm.Mentor.nombre}`);
      console.log(`   Estudiante: ${comm.Student.nombre}`);
      console.log(`   Monto: $${comm.payableAmount}`);
      console.log(`   Estado: ${comm.status}`);
      console.log(`   Fecha: ${comm.completedAt?.toLocaleDateString('es-MX')}`);
      console.log('   ---');
    });

    if (packageCommissions.length === 0) {
      console.log('✅ No hay comisiones anticipadas que limpiar.\n');
      return;
    }

    console.log('\n⚠️  ESTAS COMISIONES ESTÁN MAL porque:');
    console.log('   • Se registraron al momento de COMPRAR el paquete');
    console.log('   • El monto es por TODO el paquete ($1,399 o $1,620)');
    console.log('   • Las sesiones aún NO se han completado\n');

    console.log('✅ LO CORRECTO es:');
    console.log('   • NO registrar nada al comprar');
    console.log('   • Registrar $90 POR CADA sesión que el mentor complete');
    console.log('   • Al completar 18 sesiones → $1,620 total acumulado\n');

    // Eliminar las comisiones incorrectas
    const deleted = await prisma.commissionLedger.deleteMany({
      where: {
        sourceType: 'PACKAGE_SESSION'
      }
    });

    console.log(`🗑️  Eliminadas ${deleted.count} comisiones anticipadas incorrectas`);
    console.log('✅ Ahora las comisiones se registrarán correctamente ($90 por sesión completada)\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCommissionLedger();
