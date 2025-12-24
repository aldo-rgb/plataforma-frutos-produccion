/**
 * Script de Migración: Asignar Ciclo Personal a Usuarios sin Ciclo
 * 
 * Este script:
 * 1. Busca todos los usuarios PARTICIPANTE sin ciclo activo
 * 2. Crea un ciclo personal (SOLO) de 100 días para cada uno
 * 3. Registra el proceso
 */

const { PrismaClient } = require('@prisma/client');
const { addDays } = require('date-fns');

const prisma = new PrismaClient();

async function migrarUsuariosSinCiclo() {
  try {
    console.log('🔍 Buscando usuarios sin ciclo activo...\n');

    // Obtener todos los PARTICIPANTES
    const participantes = await prisma.usuario.findMany({
      where: {
        rol: 'PARTICIPANTE'
      },
      include: {
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: {
            status: 'ACTIVE'
          }
        }
      }
    });

    console.log(`📊 Total de participantes: ${participantes.length}`);

    // Filtrar usuarios sin ciclo activo
    const usuariosSinCiclo = participantes.filter(
      u => u.ProgramEnrollment_ProgramEnrollment_userIdToUsuario.length === 0
    );

    console.log(`⚠️  Usuarios sin ciclo activo: ${usuariosSinCiclo.length}\n`);

    if (usuariosSinCiclo.length === 0) {
      console.log('✅ Todos los participantes ya tienen un ciclo asignado');
      return;
    }

    // Crear ciclos para usuarios sin ciclo
    let creados = 0;
    let errores = 0;

    for (const usuario of usuariosSinCiclo) {
      try {
        const hoy = new Date();
        const fechaFin = addDays(hoy, 90);

        await prisma.programEnrollment.create({
          data: {
            userId: usuario.id,
            mentorId: usuario.id, // Se asigna a sí mismo en ciclo personal
            cycleType: 'SOLO',
            cycleStartDate: hoy,
            cycleEndDate: fechaFin,
            startDate: hoy, // Para compatibilidad con campos legacy
            endDate: fechaFin,
            totalWeeks: 13, // ~90 días = 13 semanas
            status: 'ACTIVE'
          }
        });

        creados++;
        console.log(`✅ [${creados}/${usuariosSinCiclo.length}] Ciclo creado para: ${usuario.nombre} (${usuario.email})`);

      } catch (error) {
        errores++;
        console.error(`❌ Error al crear ciclo para ${usuario.nombre}:`, error.message);
      }
    }

    console.log('\n📈 RESUMEN:');
    console.log(`   ✅ Ciclos creados: ${creados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📊 Total procesados: ${usuariosSinCiclo.length}`);

  } catch (error) {
    console.error('❌ Error en el proceso de migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrarUsuariosSinCiclo();
