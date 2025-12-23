#!/usr/bin/env ts-node

/**
 * 🤖 CRON JOB: Evaluación Masiva de Promociones de Mentores
 * 
 * Este script debe ejecutarse periódicamente (ej. diario) para evaluar
 * si algún mentor cumple los umbrales para ser promovido.
 * 
 * Configuración recomendada en crontab:
 * 0 2 * * * cd /path/to/app && npx ts-node scripts/evaluar-promociones-mentores.ts
 * 
 * Ejecución manual:
 * npx ts-node --compiler-options '{"module":"commonjs"}' scripts/evaluar-promociones-mentores.ts
 */

import { evaluarPromocionesTodosLosMentores } from '../lib/mentor-rating-service';

async function main() {
  console.log('🚀 Iniciando evaluación masiva de promociones de mentores...\n');

  try {
    const resultado = await evaluarPromocionesTodosLosMentores();

    console.log('\n✅ EVALUACIÓN COMPLETADA');
    console.log(`   Total evaluados: ${resultado.totalEvaluados}`);
    console.log(`   Promociones realizadas: ${resultado.totalPromociones}`);

    if (resultado.totalPromociones > 0) {
      console.log('\n🎉 PROMOCIONES REALIZADAS:');
      resultado.promociones.forEach((promo: any) => {
        console.log(`   - Mentor ID ${promo.mentorId} (Usuario ${promo.usuarioId})`);
        console.log(`     ${promo.promocion.nivelAnterior} → ${promo.promocion.nivelNuevo}`);
        console.log(`     Métricas: ${JSON.stringify(promo.promocion.metricas)}`);
      });
    } else {
      console.log('\n📝 No se realizaron promociones en esta evaluación.');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR en evaluación masiva:', error);
    process.exit(1);
  }
}

// Ejecutar script
main();
