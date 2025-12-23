/**
 * Script para inicializar el sistema de XP/Niveles en usuarios existentes
 * 
 * Este script:
 * - Inicializa experienciaXP en 0 para usuarios sin XP
 * - Establece nivelActual en 1 
 * - Establece rangoActual en "Novato Rastreador"
 * - Inicializa completionStreak en 0
 * - Inicializa collectionsCompleted como array vacío
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Inicializando sistema de XP/Niveles...');

  try {
    // Obtener todos los usuarios
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        experienciaXP: true,
        nivelActual: true,
        rangoActual: true,
      }
    });

    console.log(`📊 Encontrados ${usuarios.length} usuarios`);

    let actualizados = 0;

    // Actualizar usuarios que no tengan valores inicializados
    for (const usuario of usuarios) {
      const needsUpdate = 
        usuario.experienciaXP === null || 
        usuario.nivelActual === null || 
        usuario.rangoActual === null;

      if (needsUpdate) {
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            experienciaXP: usuario.experienciaXP ?? 0,
            nivelActual: usuario.nivelActual ?? 1,
            rangoActual: usuario.rangoActual ?? "Novato Rastreador",
            completionStreak: 0,
            collectionsCompleted: [],
          }
        });
        
        console.log(`✅ Usuario actualizado: ${usuario.nombre} (ID: ${usuario.id})`);
        actualizados++;
      }
    }

    console.log(`\n✨ Proceso completado!`);
    console.log(`   - Total usuarios: ${usuarios.length}`);
    console.log(`   - Actualizados: ${actualizados}`);
    console.log(`   - Ya inicializados: ${usuarios.length - actualizados}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
