const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Buscando Game Changers sin licencia...\n');

    // 1. Obtener Game Changers sin licencia
    const gameChangers = await prisma.usuario.findMany({
      where: {
        rol: 'GAMECHANGER',
        organizationId: { in: [1, 2] }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true
      }
    });

    console.log(`📊 Total Game Changers: ${gameChangers.length}\n`);

    // 2. Verificar cuáles YA tienen licencia
    const existingAssignments = await prisma.licenseAssignment.findMany({
      where: {
        userId: { in: gameChangers.map(gc => gc.id) }
      },
      select: {
        userId: true
      }
    });

    const userIdsWithLicense = existingAssignments.map(a => a.userId);
    const gameChangersWithoutLicense = gameChangers.filter(gc => !userIdsWithLicense.includes(gc.id));

    console.log(`❌ Game Changers SIN licencia: ${gameChangersWithoutLicense.length}\n`);

    if (gameChangersWithoutLicense.length === 0) {
      console.log('✅ Todos los Game Changers ya tienen licencia!');
      return;
    }

    // 3. Obtener visión activa para cada organización
    const vision1 = await prisma.vision.findFirst({
      where: {
        organizationId: 1,
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        endDate: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    const vision2 = await prisma.vision.findFirst({
      where: {
        organizationId: 2,
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        endDate: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    console.log('🎯 Visiones encontradas:');
    if (vision1) console.log(`  Org 1: ${vision1.nombre} (ID: ${vision1.id})`);
    if (vision2) console.log(`  Org 2: ${vision2.nombre} (ID: ${vision2.id})`);
    console.log('');

    // 4. Crear licencias para cada Game Changer
    for (const gc of gameChangersWithoutLicense) {
      const vision = gc.organizationId === 1 ? vision1 : vision2;
      
      if (!vision) {
        console.log(`⚠️  ${gc.nombre}: No hay visión activa para org ${gc.organizationId}`);
        continue;
      }

      const licenseCode = `QNT-GC-STD-${gc.id}-${Date.now()}`;
      
      await prisma.licenseAssignment.create({
        data: {
          userId: gc.id,
          organizationId: gc.organizationId,
          visionId: vision.id,
          assignedBy: 1, // Admin
          assignedAt: new Date(),
          licenseCode: licenseCode,
          isActive: true,
          activatedAt: new Date(),
          expiresAt: vision.endDate,
          notes: 'Licencia STANDARD automática - Game Changer - Asignación retroactiva'
        }
      });

      console.log(`✅ ${gc.nombre} (${gc.email})`);
      console.log(`   Code: ${licenseCode}`);
      console.log(`   Visión: ${vision.nombre}\n`);
    }

    console.log('🎉 ¡Licencias asignadas exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
