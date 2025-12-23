#!/usr/bin/env ts-node

/**
 * 🧪 SCRIPT DE PRUEBA: Sistema de Reviews y Promociones
 * 
 * Este script simula el flujo completo:
 * 1. Crear solicitudes de mentoría
 * 2. Completar sesiones
 * 3. Crear reviews
 * 4. Verificar promociones automáticas
 * 
 * Ejecución:
 * npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-sistema-reviews.ts
 */

import { PrismaClient } from '@prisma/client';
import { crearReview, completarSesion, obtenerEstadisticasMentor } from '../lib/mentor-rating-service';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE REVIEWS\n');

  try {
    // 1. Obtener un mentor JUNIOR para probar
    const mentor = await prisma.perfilMentor.findFirst({
      where: { 
        nivel: 'JUNIOR',
        disponible: true 
      },
      include: { Usuario: true }
    });

    if (!mentor) {
      console.log('❌ No se encontró ningún mentor JUNIOR para probar');
      return;
    }

    console.log(`✅ Mentor encontrado: ${mentor.Usuario.nombre} (ID: ${mentor.id})`);
    console.log(`   Nivel actual: ${mentor.nivel}`);
    console.log(`   Rating actual: ${mentor.calificacionPromedio}`);
    console.log(`   Sesiones completadas: ${mentor.completedSessionsCount}`);
    console.log(`   Total reseñas: ${mentor.ratingCount}\n`);

    // 2. Obtener un cliente para crear reviews
    const cliente = await prisma.usuario.findFirst({
      where: { rol: 'PARTICIPANTE' }
    });

    if (!cliente) {
      console.log('❌ No se encontró ningún cliente para crear reviews');
      return;
    }

    console.log(`✅ Cliente encontrado: ${cliente.nombre} (ID: ${cliente.id})\n`);

    // 3. Crear servicio si no existe
    let servicio = await prisma.servicioMentoria.findFirst({
      where: { perfilMentorId: mentor.id }
    });

    if (!servicio) {
      servicio = await prisma.servicioMentoria.create({
        data: {
          perfilMentorId: mentor.id,
          tipo: 'INDIVIDUAL',
          nombre: 'Asesoría Express (Test)',
          descripcion: 'Servicio de prueba para testing',
          duracionHoras: 1,
          precioTotal: 500,
          activo: true
        }
      });
      console.log(`✅ Servicio de prueba creado (ID: ${servicio.id})\n`);
    }

    // 4. Simular 25 sesiones para alcanzar el nivel SENIOR
    console.log('🔄 Simulando 25 sesiones con reviews...\n');

    for (let i = 1; i <= 25; i++) {
      // Crear solicitud
      const solicitud = await prisma.solicitudMentoria.create({
        data: {
          clienteId: cliente.id,
          perfilMentorId: mentor.id,
          servicioId: servicio.id,
          estado: 'PENDIENTE',
          montoTotal: 500,
          montoPagadoMentor: 425,
          montoPagadoPlataforma: 75
        }
      });

      // Completar sesión
      await completarSesion(solicitud.id);

      // Crear review (alternar entre 4 y 5 estrellas para promedio ~4.6)
      const calificacion = i % 3 === 0 ? 4 : 5;
      await crearReview({
        solicitudId: solicitud.id,
        clienteId: cliente.id,
        perfilMentorId: mentor.id,
        calificacion,
        comentario: `Review de prueba ${i}. Excelente sesión!`
      });

      if (i % 5 === 0) {
        console.log(`   ✓ Completadas ${i}/25 sesiones`);
      }
    }

    console.log('\n✅ 25 sesiones completadas y calificadas!\n');

    // 5. Obtener estadísticas actualizadas
    const estadisticas = await obtenerEstadisticasMentor(mentor.id);

    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`   Nivel: ${estadisticas.nivel}`);
    console.log(`   Rating promedio: ${estadisticas.ratingPromedio}/5.0`);
    console.log(`   Total sesiones: ${estadisticas.sesionesCompletadas}`);
    console.log(`   Total reseñas: ${estadisticas.totalResenas}`);
    console.log(`   Próximo nivel: ${estadisticas.proximoNivel || 'Nivel máximo'}`);
    console.log(`   Progreso: ${estadisticas.progresoPorcentaje}%\n`);

    // 6. Verificar si fue promovido
    const mentorActualizado = await prisma.perfilMentor.findUnique({
      where: { id: mentor.id }
    });

    if (mentorActualizado && mentorActualizado.nivel !== mentor.nivel) {
      console.log(`🎉 ¡PROMOCIÓN EXITOSA! ${mentor.nivel} → ${mentorActualizado.nivel}\n`);
    } else {
      console.log(`⏳ Aún no alcanza los umbrales para ${estadisticas.proximoNivel}\n`);
      
      if (estadisticas.umbralesProximoNivel) {
        console.log('📋 Requisitos pendientes:');
        console.log(`   Sesiones: ${estadisticas.sesionesCompletadas}/${estadisticas.umbralesProximoNivel.sesionesMinimas}`);
        console.log(`   Rating: ${estadisticas.ratingPromedio}/${estadisticas.umbralesProximoNivel.ratingMinimo}`);
        console.log(`   Reseñas: ${estadisticas.totalResenas}/${estadisticas.umbralesProximoNivel.resenasMinimas}\n`);
      }
    }

    console.log('✅ PRUEBAS COMPLETADAS EXITOSAMENTE\n');

  } catch (error) {
    console.error('❌ ERROR en las pruebas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
