import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script de migración: Convierte las metas legacy (campos individuales en CartaFrutos)
 * al nuevo sistema multi-meta (tablas Meta y Accion)
 */

async function migrarDatosLegacy() {
  console.log('🔄 Iniciando migración de datos legacy → multi-meta...\n');

  try {
    // Obtener todas las cartas existentes
    const cartas = await prisma.cartaFrutos.findMany({
      include: {
        Tarea: true
      }
    });

    console.log(`📊 Encontradas ${cartas.length} cartas para migrar\n`);

    for (const carta of cartas) {
      console.log(`\n📝 Procesando carta ID: ${carta.id} (Usuario: ${carta.usuarioId})`);

      const categorias = [
        { 
          id: 'FINANZAS', 
          metaCampo: carta.finanzasMeta,
          declaracionCampo: carta.finanzasDeclaracion,
          avance: carta.finanzasAvance
        },
        { 
          id: 'RELACIONES', 
          metaCampo: carta.relacionesMeta,
          declaracionCampo: carta.relacionesDeclaracion,
          avance: carta.relacionesAvance
        },
        { 
          id: 'TALENTOS', 
          metaCampo: carta.talentosMeta,
          declaracionCampo: carta.talentosDeclaracion,
          avance: carta.talentosAvance
        },
        { 
          id: 'PAZ_MENTAL', 
          metaCampo: carta.pazMentalMeta,
          declaracionCampo: carta.pazMentalDeclaracion,
          avance: carta.pazMentalAvance
        },
        { 
          id: 'OCIO', 
          metaCampo: carta.ocioMeta,
          declaracionCampo: carta.ocioDeclaracion,
          avance: carta.ocioAvance
        },
        { 
          id: 'SALUD', 
          metaCampo: carta.saludMeta,
          declaracionCampo: carta.saludDeclaracion,
          avance: carta.saludAvance
        },
        { 
          id: 'COMUNIDAD', 
          metaCampo: carta.servicioComunMeta,
          declaracionCampo: carta.servicioComunDeclaracion,
          avance: carta.servicioComunAvance
        },
        { 
          id: 'ENROLAMIENTO', 
          metaCampo: carta.enrolamientoMeta,
          declaracionCampo: null,
          avance: carta.enrolamientoAvance
        },
      ];

      for (const cat of categorias) {
        // Solo migrar si existe una meta principal
        if (cat.metaCampo && cat.metaCampo.trim()) {
          console.log(`  → Migrando ${cat.id}...`);

          // Buscar tareas asociadas a esta categoría
          const tareasCategoria = carta.Tarea.filter(
            (t: any) => t.categoria.toLowerCase() === cat.id.toLowerCase().replace('_', '')
          );

          // Crear meta con sus acciones
          await prisma.meta.create({
            data: {
              cartaId: carta.id,
              categoria: cat.id,
              orden: 1,
              declaracionPoder: cat.declaracionCampo || null,
              metaPrincipal: cat.metaCampo,
              avance: cat.avance,
              Accion: {
                create: tareasCategoria.map((tarea: any) => ({
                  texto: tarea.descripcion,
                  diasProgramados: null, // No existe en legacy
                  completada: tarea.completada,
                  enRevision: false,
                  requiereEvidencia: tarea.requiereFoto,
                }))
              }
            }
          });

          console.log(`    ✅ Meta creada con ${tareasCategoria.length} acciones`);
        }
      }
    }

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📌 Notas:');
    console.log('   - Los campos legacy en CartaFrutos NO fueron eliminados (por seguridad)');
    console.log('   - Las tareas antiguas siguen existiendo en la tabla Tarea');
    console.log('   - Ahora puedes usar el nuevo sistema multi-meta');
    console.log('\n💡 Recomendación: Probar el nuevo sistema antes de eliminar datos legacy\n');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrarDatosLegacy()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
