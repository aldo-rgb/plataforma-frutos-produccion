const { PrismaClient } = require('@prisma/client');

async function cleanDuplicateActions() {
  const prisma = new PrismaClient();
  
  console.log('🧹 Iniciando limpieza de acciones duplicadas...\n');

  try {
    // Obtener todas las metas
    const metas = await prisma.meta.findMany({
      include: {
        Accion: {
          orderBy: { id: 'asc' }
        }
      }
    });

    let totalDuplicatesRemoved = 0;

    for (const meta of metas) {
      const acciones = meta.Accion;
      
      if (acciones.length <= 1) {
        continue; // No hay duplicados si solo hay 1 o ninguna acción
      }

      // Agrupar por texto
      const accionesPorTexto = new Map();
      
      for (const accion of acciones) {
        if (!accionesPorTexto.has(accion.texto)) {
          accionesPorTexto.set(accion.texto, []);
        }
        accionesPorTexto.get(accion.texto).push(accion);
      }

      // Eliminar duplicados (mantener el más reciente)
      for (const [texto, duplicados] of accionesPorTexto.entries()) {
        if (duplicados.length > 1) {
          // Ordenar por ID (el más alto es el más reciente)
          duplicados.sort((a, b) => b.id - a.id);
          
          // Mantener el primero (más reciente), eliminar el resto
          const toKeep = duplicados[0];
          const toDelete = duplicados.slice(1);

          console.log(`\n📋 Meta ID ${meta.id} - Acción: "${texto.substring(0, 50)}..."`);
          console.log(`   ✅ Mantener: ID ${toKeep.id}`);
          console.log(`   🗑️  Eliminar: ${toDelete.map(a => `ID ${a.id}`).join(', ')}`);

          // Eliminar duplicados
          for (const accion of toDelete) {
            await prisma.accion.delete({
              where: { id: accion.id }
            });
            totalDuplicatesRemoved++;
          }
        }
      }
    }

    console.log(`\n✅ Limpieza completada: ${totalDuplicatesRemoved} acciones duplicadas eliminadas`);

  } catch (error) {
    console.error('❌ Error durante limpieza:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

cleanDuplicateActions();
