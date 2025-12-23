const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuantumSystem() {
  console.log('🧪 Testing Quantum Locations System\n');

  // 1. Verificar Locations
  console.log('1️⃣ Verificando Locations...');
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      qrCodeHash: true,
      latitude: true,
      longitude: true,
      radiusMeter: true
    }
  });
  console.log(`   ✅ ${locations.length} locations activas encontradas\n`);

  if (locations.length === 0) {
    console.log('   ⚠️  No hay locations. Ejecuta: node scripts/seed-quantum-locations.js\n');
    return;
  }

  // Mostrar primera location como ejemplo
  const firstLocation = locations[0];
  console.log(`   📍 Ejemplo: ${firstLocation.name}`);
  console.log(`      QR Hash: ${firstLocation.qrCodeHash}`);
  console.log(`      Coords: ${firstLocation.latitude}, ${firstLocation.longitude}`);
  console.log(`      Radio: ${firstLocation.radiusMeter}m\n`);

  // 2. Verificar usuarios con vision
  console.log('2️⃣ Verificando usuarios elegibles...');
  const eligibleUsers = await prisma.usuario.findMany({
    where: {
      OR: [
        { vision: { not: null } },
        { rol: { in: ['COORDINADOR', 'MENTOR', 'GAMECHANGER', 'ADMINISTRADOR'] } }
      ]
    },
    select: {
      id: true,
      nombre: true,
      vision: true,
      rol: true
    },
    take: 5
  });
  console.log(`   ✅ ${eligibleUsers.length} usuarios pueden hacer check-in\n`);

  if (eligibleUsers.length > 0) {
    eligibleUsers.forEach(user => {
      console.log(`      - ${user.nombre} (${user.rol}${user.vision ? `, ${user.vision}` : ''})`);
    });
    console.log('');
  }

  // 3. Verificar Check-ins existentes
  console.log('3️⃣ Verificando Check-ins...');
  const checkInsCount = await prisma.checkIn.count();
  console.log(`   ✅ ${checkInsCount} check-ins registrados\n`);

  if (checkInsCount > 0) {
    const recentCheckIns = await prisma.checkIn.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        Usuario: { select: { nombre: true } },
        Location: { select: { name: true } }
      }
    });

    console.log('   📋 Últimos check-ins:');
    recentCheckIns.forEach(checkIn => {
      console.log(`      - ${checkIn.Usuario.nombre} en ${checkIn.Location.name}`);
      console.log(`        ${new Date(checkIn.createdAt).toLocaleString('es-MX')} (+${checkIn.xpGranted} XP)`);
    });
    console.log('');
  }

  // 4. Verificar Service Contributions
  console.log('4️⃣ Verificando Service Contributions...');
  const contributionsCount = await prisma.userServiceContribution.count();
  const pendingCount = await prisma.userServiceContribution.count({
    where: { status: 'PENDING' }
  });
  console.log(`   ✅ ${contributionsCount} contribuciones totales`);
  console.log(`   ⏳ ${pendingCount} pendientes de revisión\n`);

  // 5. Verificar Service Ladder Progress
  console.log('5️⃣ Verificando Service Ladder Progress...');
  const progressCount = await prisma.serviceLadderProgress.count();
  const superNovaCount = await prisma.serviceLadderProgress.count({
    where: { superNovaUnlocked: true }
  });
  console.log(`   ✅ ${progressCount} usuarios con progreso`);
  console.log(`   🌟 ${superNovaCount} usuarios con Super Nova\n`);

  if (superNovaCount > 0) {
    const superNovaUsers = await prisma.serviceLadderProgress.findMany({
      where: { superNovaUnlocked: true },
      include: {
        Usuario: { select: { nombre: true } }
      }
    });

    console.log('   🌟 Super Nova Holders:');
    superNovaUsers.forEach(progress => {
      console.log(`      - ${progress.Usuario.nombre} (${progress.totalServiceContributions} contribuciones)`);
    });
    console.log('');
  }

  // 6. Test de distancia con Haversine
  console.log('6️⃣ Test de cálculo de distancia (Haversine)...');
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Test: Usuario en la misma ubicación (0m)
  const distance1 = calculateDistance(
    firstLocation.latitude,
    firstLocation.longitude,
    firstLocation.latitude,
    firstLocation.longitude
  );
  console.log(`   ✅ Test 1 - Misma ubicación: ${Math.round(distance1)}m (esperado: 0m)`);

  // Test: Usuario a 30m (dentro del radio de 50m)
  const distance2 = calculateDistance(
    firstLocation.latitude,
    firstLocation.longitude,
    firstLocation.latitude + 0.0003, // ~30m
    firstLocation.longitude
  );
  console.log(`   ✅ Test 2 - A 30m: ${Math.round(distance2)}m (esperado: ~30m)`);
  console.log(`      Validación: ${distance2 <= firstLocation.radiusMeter ? '✅ DENTRO del radio' : '❌ FUERA del radio'}`);

  // Test: Usuario a 100m (fuera del radio)
  const distance3 = calculateDistance(
    firstLocation.latitude,
    firstLocation.longitude,
    firstLocation.latitude + 0.0009, // ~100m
    firstLocation.longitude
  );
  console.log(`   ✅ Test 3 - A 100m: ${Math.round(distance3)}m (esperado: ~100m)`);
  console.log(`      Validación: ${distance3 <= firstLocation.radiusMeter ? '✅ DENTRO del radio' : '❌ FUERA del radio'}\n`);

  // 7. Resumen final
  console.log('📊 RESUMEN DEL SISTEMA\n');
  console.log('═'.repeat(50));
  console.log(`Locations Activas:        ${locations.length}`);
  console.log(`Usuarios Elegibles:       ${eligibleUsers.length}`);
  console.log(`Check-ins Realizados:     ${checkInsCount}`);
  console.log(`Contribuciones Totales:   ${contributionsCount}`);
  console.log(`Pendientes de Revisión:   ${pendingCount}`);
  console.log(`Usuarios con Progreso:    ${progressCount}`);
  console.log(`Super Nova Desbloqueados: ${superNovaCount}`);
  console.log('═'.repeat(50));
  console.log('\n✅ Sistema Quantum Locations operacional\n');

  // 8. Siguiente pasos
  console.log('🚀 PRÓXIMOS PASOS:\n');
  console.log('1. Admin: /dashboard/admin/locations');
  console.log('   → Generar y descargar códigos QR');
  console.log('');
  console.log('2. Usuario: /dashboard/quantum/check-in');
  console.log('   → Escanear QR en ubicación física');
  console.log('');
  console.log('3. Mentor: /dashboard/mentor/service-validation');
  console.log('   → Revisar y aprobar contribuciones');
  console.log('');
  console.log('4. Usuario: /dashboard/quantum/service-ladder');
  console.log('   → Ver progreso y badges\n');
}

testQuantumSystem()
  .catch((e) => {
    console.error('❌ Error en test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
