/**
 * 🔄 SCRIPT DE EVALUACIÓN MASIVA DE MENTORES
 * 
 * Este script evalúa todos los mentores del sistema y actualiza:
 * - Niveles (JUNIOR, SENIOR, MASTER)
 * - Comisiones automáticas según nivel
 * 
 * Ejecutar con:
 * npx ts-node --compiler-options '{"module":"commonjs"}' scripts/evaluar-todos-mentores.ts
 */

import { evaluateAllMentors } from '../lib/levelUpSystem';

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🚀 EVALUACIÓN MASIVA DE MENTORES');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await evaluateAllMentors();
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════');
    console.error('❌ ERROR EN LA EVALUACIÓN');
    console.error('═══════════════════════════════════════════════════');
    console.error(error);
    process.exit(1);
  }
}

main();
