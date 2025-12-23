/**
 * 🌟 SISTEMA DE REVIEWS Y PROMOCIÓN AUTOMÁTICA DE MENTORES
 * 
 * Este servicio maneja:
 * 1. Creación de reviews después de sesiones completadas
 * 2. Actualización automática de ratings (ratingSum, ratingCount)
 * 3. Cálculo de rating promedio
 * 4. Promoción automática de niveles (JUNIOR -> SENIOR -> MASTER)
 * 5. Actualización automática de comisiones según nivel
 */

import { PrismaClient, NivelMentor } from '@prisma/client';
import { evaluateMentorLevel } from './levelUpSystem';
import { checkAndAwardBadges } from './badgeSystem'; // 🏅 NUEVO: Sistema de medallas

const prisma = new PrismaClient();

// =====================================================
// UMBRALES PARA PROMOCIÓN DE NIVELES
// =====================================================

const UMBRALES_NIVEL = {
  SENIOR: {
    sesionesMinimas: 20,
    ratingMinimo: 4.5,
    resenasMinimas: 10
  },
  MASTER: {
    sesionesMinimas: 50,
    ratingMinimo: 4.7,
    resenasMinimas: 30
  }
};

// =====================================================
// 1. CREAR REVIEW Y ACTUALIZAR RATINGS
// =====================================================

export async function crearReview(data: {
  solicitudId: number;
  clienteId: number;
  perfilMentorId: number;
  calificacion: number; // 1-5
  comentario?: string;
  sharedResources?: boolean; // 🏅 NUEVO: Para insignia Erudito
}) {
  try {
    const { solicitudId, clienteId, perfilMentorId, calificacion, comentario, sharedResources } = data;

    // Validar que la calificación sea válida
    if (calificacion < 1 || calificacion > 5) {
      throw new Error('La calificación debe estar entre 1 y 5 estrellas');
    }

    // Verificar que la solicitud existe y está completada
    const solicitud = await prisma.solicitudMentoria.findUnique({
      where: { id: solicitudId }
    });

    if (!solicitud) {
      throw new Error('Solicitud de mentoría no encontrada');
    }

    if (solicitud.estado !== 'COMPLETADA') {
      throw new Error('Solo se pueden calificar sesiones completadas');
    }

    // Verificar que no exista ya una reseña para esta solicitud
    const resenaExistente = await prisma.resenasMentoria.findUnique({
      where: { solicitudId }
    });

    if (resenaExistente) {
      throw new Error('Esta sesión ya ha sido calificada');
    }

    // Crear la reseña y actualizar ratings en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la reseña
      const nuevaResena = await tx.resenasMentoria.create({
        data: {
          solicitudId,
          clienteId,
          perfilMentorId,
          calificacion,
          comentario: comentario || null,
          sharedResources: sharedResources || false, // 🏅 NUEVO: Para insignia Erudito
          verificadaSesion: true
        }
      });

      // 2. Obtener perfil actual del mentor
      const perfilMentor = await tx.perfilMentor.findUnique({
        where: { id: perfilMentorId }
      });

      if (!perfilMentor) {
        throw new Error('Perfil de mentor no encontrado');
      }

      // 3. Calcular nuevos valores de rating
      const nuevoRatingSum = Number(perfilMentor.ratingSum) + calificacion;
      const nuevoRatingCount = perfilMentor.ratingCount + 1;
      const nuevoRatingPromedio = nuevoRatingSum / nuevoRatingCount;

      // 4. Actualizar perfil del mentor
      const perfilActualizado = await tx.perfilMentor.update({
        where: { id: perfilMentorId },
        data: {
          ratingSum: nuevoRatingSum,
          ratingCount: nuevoRatingCount,
          calificacionPromedio: nuevoRatingPromedio,
          totalResenas: nuevoRatingCount
        }
      });

      return { resena: nuevaResena, perfil: perfilActualizado };
    });

    // 5. Evaluar promoción automática de nivel (incluye actualización de comisiones)
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { id: perfilMentorId },
      select: { usuarioId: true }
    });
    
    if (perfilMentor) {
      await evaluateMentorLevel(perfilMentor.usuarioId);
      // 🏅 NUEVO: Evaluar medallas después de la reseña
      await checkAndAwardBadges(perfilMentor.usuarioId);
    }

    return {
      success: true,
      message: 'Reseña creada exitosamente',
      data: result
    };

  } catch (error: any) {
    console.error('❌ Error al crear reseña:', error);
    throw error;
  }
}

// =====================================================
// 2. MARCAR SESIÓN COMO COMPLETADA
// =====================================================

export async function completarSesion(solicitudId: number) {
  try {
    // Actualizar estado de la solicitud
    const solicitud = await prisma.solicitudMentoria.update({
      where: { id: solicitudId },
      data: { estado: 'COMPLETADA' }
    });

    // Incrementar contador de sesiones completadas del mentor
    const perfilActualizado = await prisma.perfilMentor.update({
      where: { id: solicitud.perfilMentorId },
      data: {
        completedSessionsCount: {
          increment: 1
        },
        totalSesiones: {
          increment: 1
        }
      }
    });

    // Evaluar promoción automática (incluye actualización de comisiones)
    await evaluateMentorLevel(perfilActualizado.usuarioId);

    return {
      success: true,
      message: 'Sesión marcada como completada',
      solicitudId
    };

  } catch (error: any) {
    console.error('❌ Error al completar sesión:', error);
    throw error;
  }
}

// =====================================================
// 3. EVALUAR PROMOCIÓN AUTOMÁTICA DE NIVEL
// =====================================================

export async function evaluarPromocionNivel(perfilMentorId: number) {
  try {
    const perfil = await prisma.perfilMentor.findUnique({
      where: { id: perfilMentorId }
    });

    if (!perfil) {
      throw new Error('Perfil de mentor no encontrado');
    }

    const ratingPromedio = perfil.calificacionPromedio;
    const sesionesCompletadas = perfil.completedSessionsCount;
    const totalResenas = perfil.ratingCount;

    let nuevoNivel: NivelMentor | null = null;

    // Evaluar promoción a MASTER
    if (perfil.nivel !== 'MASTER') {
      if (
        sesionesCompletadas >= UMBRALES_NIVEL.MASTER.sesionesMinimas &&
        ratingPromedio >= UMBRALES_NIVEL.MASTER.ratingMinimo &&
        totalResenas >= UMBRALES_NIVEL.MASTER.resenasMinimas
      ) {
        nuevoNivel = 'MASTER';
      }
      // Evaluar promoción a SENIOR
      else if (
        perfil.nivel === 'JUNIOR' &&
        sesionesCompletadas >= UMBRALES_NIVEL.SENIOR.sesionesMinimas &&
        ratingPromedio >= UMBRALES_NIVEL.SENIOR.ratingMinimo &&
        totalResenas >= UMBRALES_NIVEL.SENIOR.resenasMinimas
      ) {
        nuevoNivel = 'SENIOR';
      }
    }

    // Si hay promoción, actualizar el perfil
    if (nuevoNivel && nuevoNivel !== perfil.nivel) {
      await prisma.perfilMentor.update({
        where: { id: perfilMentorId },
        data: { nivel: nuevoNivel }
      });

      console.log(`🎉 ¡PROMOCIÓN! Mentor ${perfil.usuarioId}: ${perfil.nivel} -> ${nuevoNivel}`);

      return {
        promocionado: true,
        nivelAnterior: perfil.nivel,
        nivelNuevo: nuevoNivel,
        metricas: {
          sesionesCompletadas,
          ratingPromedio,
          totalResenas
        }
      };
    }

    return {
      promocionado: false,
      nivelActual: perfil.nivel,
      metricas: {
        sesionesCompletadas,
        ratingPromedio,
        totalResenas
      }
    };

  } catch (error: any) {
    console.error('❌ Error al evaluar promoción:', error);
    throw error;
  }
}

// =====================================================
// 4. OBTENER ESTADÍSTICAS DE MENTOR
// =====================================================

export async function obtenerEstadisticasMentor(perfilMentorId: number) {
  try {
    const perfil = await prisma.perfilMentor.findUnique({
      where: { id: perfilMentorId },
      include: {
        MentorReview: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            Cliente: {
              select: {
                nombre: true,
                imagen: true
              }
            }
          }
        }
      }
    });

    if (!perfil) {
      throw new Error('Perfil de mentor no encontrado');
    }

    const ratingPromedio = perfil.calificacionPromedio;
    const proximoNivel = calcularProximoNivel(perfil.nivel);
    const progresoPorcentaje = calcularProgresoHaciaNivel(perfil, proximoNivel);

    return {
      nivel: perfil.nivel,
      ratingPromedio: ratingPromedio.toFixed(1),
      totalResenas: perfil.ratingCount,
      sesionesCompletadas: perfil.completedSessionsCount,
      totalSesiones: perfil.totalSesiones,
      proximoNivel,
      progresoPorcentaje,
      resenas: perfil.MentorReview,
      umbralesProximoNivel: proximoNivel ? UMBRALES_NIVEL[proximoNivel as keyof typeof UMBRALES_NIVEL] : null
    };

  } catch (error: any) {
    console.error('❌ Error al obtener estadísticas:', error);
    throw error;
  }
}

// =====================================================
// 5. UTILIDADES
// =====================================================

function calcularProximoNivel(nivelActual: NivelMentor): NivelMentor | null {
  switch (nivelActual) {
    case 'JUNIOR':
      return 'SENIOR';
    case 'SENIOR':
      return 'MASTER';
    case 'MASTER':
      return null; // Ya está en el nivel máximo
    default:
      return null;
  }
}

function calcularProgresoHaciaNivel(
  perfil: any,
  proximoNivel: NivelMentor | null
): number {
  if (!proximoNivel) return 100; // Ya está en nivel máximo

  const umbrales = UMBRALES_NIVEL[proximoNivel as keyof typeof UMBRALES_NIVEL];
  
  const progresoSesiones = Math.min(100, (perfil.completedSessionsCount / umbrales.sesionesMinimas) * 100);
  const progresoRating = Math.min(100, (perfil.calificacionPromedio / umbrales.ratingMinimo) * 100);
  const progresoResenas = Math.min(100, (perfil.ratingCount / umbrales.resenasMinimas) * 100);

  // Promedio ponderado
  return Math.round((progresoSesiones + progresoRating + progresoResenas) / 3);
}

// =====================================================
// 6. CRON JOB / TRIGGER PARA EVALUACIÓN MASIVA
// =====================================================

export async function evaluarPromocionesTodosLosMentores() {
  try {
    const mentores = await prisma.perfilMentor.findMany({
      where: { disponible: true }
    });

    const resultados = [];

    for (const mentor of mentores) {
      const resultado = await evaluarPromocionNivel(mentor.id);
      if (resultado.promocionado) {
        resultados.push({
          mentorId: mentor.id,
          usuarioId: mentor.usuarioId,
          promocion: resultado
        });
      }
    }

    console.log(`✅ Evaluación masiva completada. ${resultados.length} promociones realizadas.`);

    return {
      success: true,
      totalEvaluados: mentores.length,
      totalPromociones: resultados.length,
      promociones: resultados
    };

  } catch (error: any) {
    console.error('❌ Error en evaluación masiva:', error);
    throw error;
  }
}

// =====================================================
// EXPORTAR FUNCIONES
// =====================================================

export default {
  crearReview,
  completarSesion,
  evaluarPromocionNivel,
  obtenerEstadisticasMentor,
  evaluarPromocionesTodosLosMentores,
  UMBRALES_NIVEL
};
