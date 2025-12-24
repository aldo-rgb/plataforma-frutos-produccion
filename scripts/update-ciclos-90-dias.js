/**
 * Script de Actualización: Cambiar ciclos de 100 a 90 días
 * 
 * Este script actualiza los ciclos existentes para que duren 90 días en lugar de 100
 */

const { PrismaClient } = require('@prisma/client');
const { addDays } = require('date-fns');

const prisma = new PrismaClient();

async function actualizarDuracionCiclos() {
  try {
    console.log('🔍 Buscando ciclos activos con duración de 100 días...\n');

    // Obtener todos los ciclos activos
    const ciclosActivos = await prisma.programEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        cycleType: 'SOLO'
      },
      include: {
        Usuario_ProgramEnrollment_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    console.log(`📊 Total de ciclos activos: ${ciclosActivos.length}\n`);

    if (ciclosActivos.length === 0) {
      console.log('✅ No hay ciclos activos para actualizar');
      return;
    }

    let actualizados = 0;
    let errores = 0;

    for (const ciclo of ciclosActivos) {
      try {
        const usuario = ciclo.Usuario_ProgramEnrollment_userIdToUsuario;
        
        // Recalcular fecha de fin: startDate + 90 días
        const nuevaFechaFin = addDays(ciclo.cycleStartDate, 90);

        await prisma.programEnrollment.update({
          where: { id: ciclo.id },
          data: {
            cycleEndDate: nuevaFechaFin,
            endDate: nuevaFechaFin, // Legacy field
            totalWeeks: 13 // ~90 días = 13 semanas
          }
        });

        actualizados++;
        console.log(`✅ [${actualizados}/${ciclosActivos.length}] Ciclo actualizado para: ${usuario.nombre}`);
        console.log(`   Nuevo fin: ${nuevaFechaFin.toLocaleDateString()}`);

      } catch (error) {
        errores++;
        console.error(`❌ Error al actualizar ciclo:`, error.message);
      }
    }

    console.log('\n📈 RESUMEN:');
    console.log(`   ✅ Ciclos actualizados: ${actualizados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📊 Total procesados: ${ciclosActivos.length}`);
    console.log(`\n🎯 Todos los ciclos ahora duran 90 días`);

  } catch (error) {
    console.error('❌ Error en el proceso de actualización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar actualización
actualizarDuracionCiclos();
