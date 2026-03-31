import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * Libera los espacios de agenda del mentor cuando un usuario PL es marcado como DROP.
 * Cancela todas las llamadas pendientes y actualiza el estado.
 * 
 * @param userId - ID del usuario que está siendo marcado como DROP
 * @param visionId - ID de la visión (opcional, para filtrar solo llamadas de esa visión)
 * @returns Resultado de la operación con detalles de las llamadas canceladas
 */
export async function releaseMentorScheduleOnDrop(
  userId: number,
  visionId?: number
): Promise<{
  success: boolean;
  callsCancelled: number;
  mentorsAffected: number[];
  error?: string;
}> {
  try {
    logger.debug(`🗓️ Liberando espacios de mentor para usuario ${userId} (DROP)...`);

    // Buscar todas las llamadas pendientes donde el usuario es el estudiante
    // Usar valores del enum EstadoLlamada: PENDING, CONFIRMED
    const pendingCalls = await prisma.callBooking.findMany({
      where: {
        studentId: userId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      select: {
        id: true,
        mentorId: true,
        weekNumber: true,
        scheduledAt: true,
        Usuario_CallBooking_mentorIdToUsuario: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (pendingCalls.length === 0) {
      logger.debug(`ℹ️ No hay llamadas pendientes para cancelar para usuario ${userId}`);
      return {
        success: true,
        callsCancelled: 0,
        mentorsAffected: []
      };
    }

    // Obtener mentores únicos afectados
    const mentorsAffected = [...new Set(pendingCalls.map(c => c.mentorId))];
    
    logger.debug(`📞 Encontradas ${pendingCalls.length} llamadas pendientes con ${mentorsAffected.length} mentor(es)`);

    // Cancelar todas las llamadas pendientes (PENDING o CONFIRMED)
    const result = await prisma.callBooking.updateMany({
      where: {
        studentId: userId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      data: {
        status: 'CANCELLED',
        notes: `Cancelada automáticamente - Usuario marcado como DROP (${new Date().toISOString()})`,
        updatedAt: new Date()
      }
    });

    // Log detallado de las llamadas canceladas
    for (const call of pendingCalls) {
      logger.debug(`  ❌ Semana ${call.weekNumber}: ${call.scheduledAt} - Mentor: ${call.Usuario_CallBooking_mentorIdToUsuario?.nombre || call.mentorId}`);
    }

    logger.debug(`✅ ${result.count} llamada(s) canceladas para usuario ${userId}`);

    return {
      success: true,
      callsCancelled: result.count,
      mentorsAffected
    };

  } catch (error: any) {
    logger.error(`❌ Error liberando agenda de mentor:`, error);
    return {
      success: false,
      callsCancelled: 0,
      mentorsAffected: [],
      error: error?.message || 'Error desconocido'
    };
  }
}

/**
 * Verifica si un usuario tiene llamadas de mentor programadas
 * 
 * @param userId - ID del usuario a verificar
 * @returns true si tiene llamadas pendientes
 */
export async function hasPendingMentorCalls(userId: number): Promise<boolean> {
  const count = await prisma.callBooking.count({
    where: {
      studentId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] }
    }
  });
  return count > 0;
}
