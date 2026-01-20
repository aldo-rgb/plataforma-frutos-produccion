// Script para resetear las llamadas de GC al iniciar nivel AVANZADO
// Cancela las llamadas programadas del nivel BÁSICO para permitir reagendar con nuevos GC

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetGCCallsForAdvanced(visionId) {
  console.log('🔄 Reseteando llamadas de GC para nivel AVANZADO...\n');
  console.log(`📍 Vision ID: ${visionId}\n`);

  try {
    // 1. Obtener todos los squads de nivel BÁSICO de esta visión
    const basicSquads = await prisma.smallGroup.findMany({
      where: {
        visionId: parseInt(visionId),
        level: 'BASIC',
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`📦 Squads de BÁSICO encontrados: ${basicSquads.length}`);
    basicSquads.forEach(s => console.log(`   - ${s.name} (${s.id})`));

    if (basicSquads.length === 0) {
      console.log('\n⚠️ No hay squads de nivel BÁSICO para esta visión');
      return;
    }

    const squadIds = basicSquads.map(s => s.id);

    // 2. Contar llamadas programadas pendientes
    const pendingCalls = await prisma.gCCallSlot.count({
      where: {
        squadId: { in: squadIds },
        status: 'SCHEDULED',
        scheduledDate: { gte: new Date() }
      }
    });

    console.log(`\n📞 Llamadas pendientes encontradas: ${pendingCalls}`);

    if (pendingCalls === 0) {
      console.log('✅ No hay llamadas pendientes que cancelar');
      return;
    }

    // 3. Cancelar todas las llamadas pendientes de los squads de BÁSICO
    const result = await prisma.gCCallSlot.updateMany({
      where: {
        squadId: { in: squadIds },
        status: 'SCHEDULED',
        scheduledDate: { gte: new Date() }
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'Reseteo por inicio de nivel AVANZADO'
      }
    });

    console.log(`\n✅ Llamadas canceladas: ${result.count}`);

    // 4. Mostrar resumen por squad
    console.log('\n📊 Resumen por squad:');
    for (const squad of basicSquads) {
      const cancelled = await prisma.gCCallSlot.count({
        where: {
          squadId: squad.id,
          status: 'CANCELLED',
          cancelReason: 'Reseteo por inicio de nivel AVANZADO'
        }
      });
      if (cancelled > 0) {
        console.log(`   - ${squad.name}: ${cancelled} llamadas canceladas`);
      }
    }

    console.log('\n🎉 Proceso completado. Los participantes pueden agendar nuevas llamadas con sus GC de AVANZADO.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener visionId de argumentos
const visionId = process.argv[2];

if (!visionId) {
  console.log('❌ Uso: node reset-gc-calls-for-advanced.js <visionId>');
  console.log('   Ejemplo: node reset-gc-calls-for-advanced.js 2');
  process.exit(1);
}

resetGCCallsForAdvanced(visionId);
