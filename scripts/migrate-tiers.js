const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script de migración: Actualizar usuarios existentes al sistema de tiers
 * 
 * Reglas:
 * - Usuarios con suscripción ACTIVO → STANDARD tier
 * - Usuarios sin suscripción → FREE tier (default ya aplicado)
 * - Otorgar 500 PC de bienvenida a usuarios STANDARD
 */

async function migrateTiers() {
  try {
    console.log('🚀 Iniciando migración de tiers...\n');

    // 1. Contar usuarios totales
    const totalUsuarios = await prisma.usuario.count();
    console.log(`📊 Total de usuarios: ${totalUsuarios}`);

    // 2. Usuarios con suscripción activa → STANDARD
    const usuariosActivos = await prisma.usuario.updateMany({
      where: {
        suscripcion: 'ACTIVO',
        tier: 'FREE' // Solo actualizar los que aún están en FREE
      },
      data: {
        tier: 'STANDARD',
        subscriptionStatus: 'ACTIVE'
      }
    });

    console.log(`✅ ${usuariosActivos.count} usuarios actualizados a STANDARD\n`);

    // 3. Otorgar 500 PC de bienvenida a usuarios STANDARD que tienen 0 PC
    const usuariosStandard = await prisma.usuario.findMany({
      where: {
        tier: 'STANDARD',
        puntosCuanticos: 0
      },
      select: { id: true, nombre: true, email: true }
    });

    console.log(`💎 Otorgando 500 PC de bienvenida a ${usuariosStandard.length} usuarios...\n`);

    for (const usuario of usuariosStandard) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          puntosCuanticos: 500
        }
      });
      console.log(`  ✓ ${usuario.nombre} (${usuario.email}) → 500 PC`);
    }

    // 4. Resumen final
    console.log('\n📈 Resumen de migración:');
    
    const free = await prisma.usuario.count({
      where: { tier: 'FREE' }
    });
    
    const standard = await prisma.usuario.count({
      where: { tier: 'STANDARD' }
    });
    
    const premium = await prisma.usuario.count({
      where: { tier: 'PREMIUM' }
    });

    console.log(`  🆓 FREE: ${free} usuarios`);
    console.log(`  💪 STANDARD: ${standard} usuarios`);
    console.log(`  🚀 PREMIUM: ${premium} usuarios`);

    console.log('\n✅ Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateTiers();
