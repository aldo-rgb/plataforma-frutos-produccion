/**
 * Script para crear disponibilidad por defecto para todos los Game Changers
 * que no tengan configurada su disponibilidad.
 * 
 * Configuración por defecto: Lunes a Jueves, 6:00 AM - 8:00 AM, slots de 10 min
 * 
 * Ejecutar: node setup-gc-default-availability.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_AVAILABILITY = {
  days: [1, 2, 3, 4], // Lunes, Martes, Miércoles, Jueves
  startTime: '06:00',
  endTime: '08:00',
  slotDuration: 10,
};

async function setupDefaultAvailability() {
  console.log('🚀 Iniciando configuración de disponibilidad por defecto para GCs...\n');

  try {
    // Obtener todos los Game Changers (líderes de squads)
    const squads = await prisma.smallGroup.findMany({
      where: {
        isActive: true,
      },
      select: {
        leaderId: true,
        leader: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      distinct: ['leaderId'],
    });

    console.log(`📋 Encontrados ${squads.length} Game Changers con squads activos\n`);

    let created = 0;
    let skipped = 0;

    for (const squad of squads) {
      const gc = squad.leader;
      
      // Verificar si ya tiene disponibilidad configurada
      const existingAvailability = await prisma.gCAvailability.findFirst({
        where: {
          gameChangerId: gc.id,
          isActive: true,
        },
      });

      if (existingAvailability) {
        console.log(`⏭️  ${gc.nombre} (${gc.email}) - Ya tiene disponibilidad configurada`);
        skipped++;
        continue;
      }

      // Crear disponibilidad por defecto
      const availabilityData = DEFAULT_AVAILABILITY.days.map(dayOfWeek => ({
        gameChangerId: gc.id,
        dayOfWeek,
        startTime: DEFAULT_AVAILABILITY.startTime,
        endTime: DEFAULT_AVAILABILITY.endTime,
        slotDuration: DEFAULT_AVAILABILITY.slotDuration,
        isActive: true,
      }));

      await prisma.gCAvailability.createMany({
        data: availabilityData,
      });

      console.log(`✅ ${gc.nombre} (${gc.email}) - Disponibilidad creada: Lun-Jue 6-8 AM`);
      created++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   ⏭️  Omitidos (ya configurados): ${skipped}`);
    console.log(`   📋 Total GCs procesados: ${squads.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDefaultAvailability();
