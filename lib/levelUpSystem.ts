import { prisma } from './prisma';
import { NivelMentor } from '@prisma/client';

// =====================================================
// REGLAS DEL SISTEMA DE ASCENSO AUTOMÁTICO
// =====================================================
// Definimos las reglas del juego aquí para fácil ajuste

const RULES = {
  SENIOR: { 
    minSessions: 20,    // Mínimo 20 sesiones completadas
    minRating: 4.5      // Rating promedio mínimo de 4.5 estrellas
  },
  MASTER: { 
    minSessions: 50,    // Mínimo 50 sesiones completadas
    minRating: 4.7      // Rating promedio mínimo de 4.7 estrellas
  }
};

// =====================================================
// FUNCIÓN PRINCIPAL DE EVALUACIÓN
// =====================================================
/**
 * Evalúa si un mentor debe subir de nivel basado en:
 * - Sesiones completadas
 * - Rating promedio
 * 
 * Se ejecuta automáticamente después de:
 * - Completar una sesión
 * - Recibir una nueva review
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
        comisionPlataforma: true
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

    console.log(`📊 Evaluando Mentor ${mentorId}: ${sessionsCount} sesiones | Rating: ${currentRating.toFixed(2)}`);

    // 3. LÓGICA DE ASCENSO (LEVEL UP) 🚀
    let newLevel: NivelMentor = 'JUNIOR'; // Empezamos asumiendo lo básico
    let shouldUpdate = false;

    // ¿Cumple para MASTER?
    if (sessionsCount >= RULES.MASTER.minSessions && currentRating >= RULES.MASTER.minRating) {
      newLevel = 'MASTER';
      shouldUpdate = perfilMentor.nivel !== 'MASTER';
    } 
    // Si no, ¿cumple para SENIOR?
    else if (sessionsCount >= RULES.SENIOR.minSessions && currentRating >= RULES.SENIOR.minRating) {
      newLevel = 'SENIOR';
      shouldUpdate = perfilMentor.nivel !== 'SENIOR';
    }
    // Si no cumple ninguno, mantener JUNIOR
    else {
      newLevel = 'JUNIOR';
      shouldUpdate = perfilMentor.nivel !== 'JUNIOR';
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

      console.log(`🚀 ¡LEVEL UP! Mentor ${mentorId} ahora es ${newLevel} (Comisión Mentor: ${newCommissionMentor}% | Plataforma: ${newCommissionPlatform}%)`);
      
      // TODO OPCIONAL: Aquí podrías:
      // - Enviar un email de felicitación
      // - Crear una notificación en el sistema
      // - Registrar el evento en un log de auditoría
      // - Otorgar puntos cuánticos bonus
      
    } else {
      console.log(`✅ Mentor ${mentorId} mantiene nivel ${perfilMentor.nivel} (Cumple requisitos actuales)`);
    }

  } catch (error) {
    console.error(`❌ Error al evaluar nivel de mentor ${mentorId}:`, error);
    // No lanzamos el error para no afectar el flujo principal
    // El sistema debe continuar funcionando aunque falle la evaluación
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
