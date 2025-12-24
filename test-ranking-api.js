/**
 * Script de prueba del endpoint /api/rankings/advanced
 * 
 * Prueba todos los tipos de ranking y timeframes
 */

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(url, description) {
  console.log(`\n🔍 Probando: ${description}`);
  console.log(`   URL: ${url}`);
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (!res.ok) {
      console.log(`   ❌ Error ${res.status}: ${JSON.stringify(data)}`);
      return;
    }
    
    console.log(`   ✅ Status: ${res.status}`);
    console.log(`   📊 Resultados: ${data.ranking?.length || 0} items`);
    
    // Mostrar primeros 3 resultados si existen
    if (data.ranking && data.ranking.length > 0) {
      console.log(`   🏆 Top 3:`);
      data.ranking.slice(0, 3).forEach((item, idx) => {
        if (item.nombre) {
          // Usuario
          console.log(`      ${idx + 1}. ${item.nombre} - ${item.quantumPoints} PC`);
        } else if (item.name) {
          // Escuela
          console.log(`      ${idx + 1}. ${item.name} - Promedio: ${item.avgPointsPerStudent} PC`);
        }
      });
    }
  } catch (error) {
    console.log(`   ❌ Error de red: ${error.message}`);
  }
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  TEST: API Rankings Advanced - Quantum Leaderboard 360°  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  // Test 1: Global ALL_TIME
  await testEndpoint(
    `${BASE_URL}/api/rankings/advanced?type=GLOBAL&timeframe=ALL_TIME`,
    'Ranking Global - Histórico'
  );
  
  // Test 2: Global WEEKLY
  await testEndpoint(
    `${BASE_URL}/api/rankings/advanced?type=GLOBAL&timeframe=WEEKLY`,
    'Ranking Global - Semanal'
  );
  
  // Test 3: School War
  await testEndpoint(
    `${BASE_URL}/api/rankings/advanced?type=SCHOOL_WAR&timeframe=ALL_TIME`,
    'Guerra de Escuelas - Histórico'
  );
  
  // Test 4: School (si existe org ID 3)
  await testEndpoint(
    `${BASE_URL}/api/rankings/advanced?type=SCHOOL&entityId=3&timeframe=ALL_TIME`,
    'Ranking por Escuela (ID 3) - Histórico'
  );
  
  // Test 5: Vision (si existe vision ID 1)
  await testEndpoint(
    `${BASE_URL}/api/rankings/advanced?type=VISION&entityId=1&timeframe=ALL_TIME`,
    'Ranking por Visión (ID 1) - Histórico'
  );
  
  // Test 6: Mentores
  await testEndpoint(
    `${BASE_URL}/api/rankings/advanced?type=MENTOR&timeframe=ALL_TIME`,
    'Top Mentores - Histórico'
  );
  
  // Test 7: Parámetros inválidos
  await testEndpoint(
    `${BASE_URL}/api/rankings/advanced?type=INVALID`,
    'Tipo de ranking inválido (debe fallar)'
  );
  
  console.log('\n✨ Tests completados\n');
}

// Ejecutar tests
runTests().catch(console.error);
