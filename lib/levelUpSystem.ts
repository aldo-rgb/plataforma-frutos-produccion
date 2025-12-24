import { prisma } from './prisma';
import { NivelMentor } from '@prisma/client';

// =====================================================
// REGLAS DEL SISTEMA DE ASCENSO AUTOMÁTICO
// =====================================================
// Sistema HÍBRIDO: Mantiene requisitos mínimos + Sistema de Puntos

const RULES = {
  SENIOR: { 
    minSessions: 20,    // Mínimo 20 sesiones completadas
    minRating: 4.5,     // Rating promedio mínimo de 4.5 estrellas
    minPuntos: 500      // 🎯 NUEVO: Sistema de Puntos
  },
  MASTER: { 
    minSessions: 50,    // Mínimo 50 sesiones completadas
    minRating: 4.7,     // Rating promedio mínimo de 4.7 estrellas
    minPuntos: 1500     // 🎯 NUEVO: Sistema de Puntos
  }
};

// =====================================================
// FUNCIÓN PRINCIPAL DE EVALUACIÓN (CON SISTEMA DE PUNTOS)
// =====================================================
/**
 * Evalúa si un mentor debe subir de nivel basado en:
 * - Sesiones completadas (mínimo)
 * - Rating promedio (mínimo)
 * - 🎯 NUEVO: Sistema de Puntos (incluye XP de mentorados, evidencias HQ, etc.)
 * 
 * Se ejecuta automáticamente después de:
 * - Completar una sesión
 * - Recibir una nueva review
 * - Actualizar métricas de mentorados
 * 
 * @param mentorId - ID del usuario mentor a evaluar
 */
export async function evaluateMentorLevel(mentorId: number): Promise<void> {
  try {
    // 1. Obtener perfil del mentor con sus estadísticas actuales
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: mentorId },
      select: {
        id: true,
        usuarioId: true,
        nivel: true,
        completedSessionsCount: true,
        ratingSum: true,
        ratingCount: true,
        comisionMentor: true,
        comisionPlataforma: true,
        puntosTotales: true,                    // 🎯 NUEVO
        mentoradosActivos: true,                // 🎯 NUEVO
        evidenciasHighQuality: true,            // 🎯 NUEVO
        xpTotalMentorados: true                 // 🎯 NUEVO
      }
    });

    // Si no existe perfil de mentor, salir silenciosamente
    if (!perfilMentor) {
      console.warn(`⚠️ No se encontró perfil de mentor para usuario ${mentorId}`);
      return;
    }

    // 2. Calcular rating promedio actual
    const currentRating = perfilMentor.ratingCount > 0 
      ? Number(perfilMentor.ratingSum) / perfilMentor.ratingCount 
      : 0;

    const sessionsCount = perfilMentor.completedSessionsCount;
    const puntosTotales = perfilMentor.puntosTotales;

    console.log(`📊 Evaluando Mentor ${mentorId}:`);
    console.log(`   - Sesiones: ${sessionsCount}`);
    console.log(`   - Rating: ${currentRating.toFixed(2)} ⭐`);
    console.log(`   - 🎯 Puntos: ${puntosTotales}`);
    console.log(`   - Mentorados: ${perfilMentor.mentoradosActivos}`);
    console.log(`   - Evidencias HQ: ${perfilMentor.evidenciasHighQuality}`);
    console.log(`   - XP generado: ${perfilMentor.xpTotalMentorados.toLocaleString()}`);

    // 3. LÓGICA DE ASCENSO (SISTEMA HÍBRIDO) 🚀
    let newLevel: NivelMentor = 'JUNIOR';
    let shouldUpdate = false;

    // ¿Cumple para MASTER? (Sesiones + Rating + Puntos)
    if (
      sessionsCount >= RULES.MASTER.minSessions && 
      currentRating >= RULES.MASTER.minRating &&
      puntosTotales >= RULES.MASTER.minPuntos
    ) {
      newLevel = 'MASTER';
      shouldUpdate = perfilMentor.nivel !== 'MASTER';
    } 
    // Si no, ¿cumple para SENIOR? (Sesiones + Rating + Puntos)
    else if (
      sessionsCount >= RULES.SENIOR.minSessions && 
      currentRating >= RULES.SENIOR.minRating &&
      puntosTotales >= RULES.SENIOR.minPuntos
    ) {
      newLevel = 'SENIOR';
      shouldUpdate = perfilMentor.nivel !== 'SENIOR';
    }
    // Si no cumple, mantener JUNIOR
    else {
      newLevel = 'JUNIOR';
      shouldUpdate = perfilMentor.nivel !== 'JUNIOR';
      
      // Mostrar qué le falta para SENIOR
      if (perfilMentor.nivel === 'JUNIOR') {
        const faltaSesiones = Math.max(0, RULES.SENIOR.minSessions - sessionsCount);
        const faltaRating = Math.max(0, RULES.SENIOR.minRating - currentRating);
        const faltaPuntos = Math.max(0, RULES.SENIOR.minPuntos - puntosTotales);
        
        if (faltaSesiones > 0 || faltaRating > 0 || faltaPuntos > 0) {
          console.log(`   📈 Para SENIOR necesita:`);
          if (faltaSesiones > 0) console.log(`      - ${faltaSesiones} sesiones más`);
          if (faltaRating > 0) console.log(`      - ${faltaRating.toFixed(1)} puntos de rating más`);
          if (faltaPuntos > 0) console.log(`      - ${faltaPuntos} puntos más 🎯`);
        }
      }
    }

    // 4. APLICAR CAMBIOS (Solo si el nivel es diferente)
    if (shouldUpdate) {
      
      // Definimos comisiones automáticas según el nuevo nivel
      let newCommissionMentor = 70;     // Junior: 70% mentor, 30% plataforma
      let newCommissionPlatform = 30;
      
      if (newLevel === 'SENIOR') {
        newCommissionMentor = 85;       // Senior: 85% mentor, 15% plataforma
        newCommissionPlatform = 15;
      }
      
      if (newLevel === 'MASTER') {
        newCommissionMentor = 90;       // Master: 90% mentor, 10% plataforma
        newCommissionPlatform = 10;
      }

      // Actualizar nivel y comisiones en la base de datos
      await prisma.perfilMentor.update({
        where: { id: perfilMentor.id },
        data: { 
          nivel: newLevel,
          comisionMentor: newCommissionMentor,
          comisionPlataforma: newCommissionPlatform
        }
      });

      console.log(`🚀 ¡LEVEL UP! Mentor ${mentorId} ahora es ${newLevel}`);
      console.log(`   💰 Nueva comisión: ${newCommissionMentor}% mentor / ${newCommissionPlatform}% plataforma`);
      
      // TODO OPCIONAL: Aquí podrías:
      // - Enviar un email de felicitación
      // - Crear una notificación en el sistema
      // - Registrar el evento en un log de auditoría
      // - Otorgar puntos cuánticos bonus
      
    } else {
      console.log(`✅ Mentor ${mentorId} mantiene nivel ${perfilMentor.nivel}`);
    }

  } catch (error) {
    console.error(`❌ Error al evaluar nivel de mentor ${mentorId}:`, error);
    // No lanzamos el error para no afectar el flujo principal
  }
}

// =====================================================
// FUNCIÓN PARA FORZAR RE-EVALUACIÓN MASIVA
// =====================================================
/**
 * Evalúa todos los mentores del sistema.
 * Útil para:
 * - Migraciones de datos
 * - Ajustes de reglas
 * - Auditorías periódicas
 * 
 * Ejecutar con: npx ts-node scripts/evaluar-todos-mentores.ts
 */
export async function evaluateAllMentors(): Promise<void> {
  try {
    console.log('🔍 Iniciando evaluación masiva de mentores...');
    
    const mentores = await prisma.perfilMentor.findMany({
      select: { usuarioId: true }
    });

    console.log(`📋 Se encontraron ${mentores.length} mentores para evaluar`);

    for (const mentor of mentores) {
      await evaluateMentorLevel(mentor.usuarioId);
    }

    console.log('✅ Evaluación masiva completada');
    
  } catch (error) {
    console.error('❌ Error en evaluación masiva:', error);
    throw error;
  }
}
