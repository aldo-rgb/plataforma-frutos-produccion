/**
 * 🏅 SCRIPT: Evaluación Masiva de Medallas de Honor
 * 
 * Este script evalúa y actualiza las medallas de TODOS los mentores activos
 * en el sistema según los criterios establecidos:
 * 
 * - INQUEBRANTABLE (🛡️): 0 faltas en últimas 5 sesiones
 * - ERUDITO (📚): Comparte recursos en 3+ de últimas 10 reseñas
 * - FLASH (⚡): 80%+ de confirmaciones rápidas
 * - ZEN_MASTER (🧘): Rating 4.8+ con 10+ reseñas
 * 
 * Ejecución:
 * npx ts-node --compiler-options '{"module":"commonjs"}' scripts/evaluar-badges-mentores.ts
 */

import { evaluateAllMentorBadges } from '../lib/badgeSystem';

async function main() {
  console.log('🏅 =============================================');
  console.log('🏅 INICIANDO EVALUACIÓN MASIVA DE MEDALLAS');
  console.log('🏅 =============================================\n');

  try {
    await evaluateAllMentorBadges();
    
    console.log('\n✅ =============================================');
    console.log('✅ EVALUACIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ =============================================');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ =============================================');
    console.error('❌ ERROR EN LA EVALUACIÓN');
    console.error('❌ =============================================');
    console.error(error);
    process.exit(1);
  }
}

main();
