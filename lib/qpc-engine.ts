/**
 * 🎯 QPC Engine - Motor de Cálculo de Puntos Cuánticos
 * 
 * Sistema de recompensas condicionales que determina cuántos puntos
 * debe recibir un usuario al aprobar su evidencia.
 * 
 * Reglas implementadas:
 * - STANDARD: Todos ganan puntos base
 * - RACE: Solo los primeros X aprobados ganan puntos completos
 * - GROUP_ALL: Todos deben completar para que paguen puntos
 * - GROUP_THRESHOLD: Un % del grupo debe completar
 * - STRICT_DEADLINE: No hay puntos si se entrega tarde
 */

import { prisma } from '@/lib/prisma';

export interface QPCCalculationResult {
  shouldAwardPoints: boolean;
  pointsToAward: number;
  reason: string;
  metadata: {
    logic: string;
    position?: number;
    totalWinners?: number;
    raceLimit?: number;
    lateSubmission?: boolean;
    deadline?: string;
    submittedAt?: string;
    groupProgress?: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

export class QPCEngine {
  /**
   * Calcula los puntos que debe recibir un usuario al aprobar su evidencia
   */
  static async calculatePoints(
    submissionId: number,
    taskId: number,
    userId: number
  ): Promise<QPCCalculationResult> {
    // Obtener la tarea con su configuración
    const task = await prisma.adminTask.findUnique({
      where: { id: taskId },
      include: {
        Submissions: {
          where: { status: 'APPROVED' },
          orderBy: { reviewedAt: 'asc' }
        }
      }
    }) as any;

    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    // Obtener la submission del usuario
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      throw new Error('Submission no encontrada');
    }

    const basePoints = task.pointsReward;

    // Ejecutar lógica según el tipo de recompensa configurado
    switch (task.rewardLogic) {
      case 'STANDARD':
        return this.calculateStandard(basePoints);

      case 'RACE':
        return this.calculateRace(task, submission, basePoints);

      case 'GROUP_ALL':
        return this.calculateGroupAll(task, userId, basePoints);

      case 'GROUP_THRESHOLD':
        return this.calculateGroupThreshold(task, userId, basePoints);

      case 'STRICT_DEADLINE':
        return this.calculateStrictDeadline(task, submission, basePoints);

      default:
        return this.calculateStandard(basePoints);
    }
  }

  /**
   * STANDARD: Todos ganan puntos base
   */
  private static calculateStandard(basePoints: number): QPCCalculationResult {
    return {
      shouldAwardPoints: true,
      pointsToAward: basePoints,
      reason: 'Evidencia aprobada. Puntos estándar otorgados.',
      metadata: {
        logic: 'STANDARD'
      }
    };
  }

  /**
   * RACE: Solo los primeros X aprobados ganan puntos completos
   * Los demás reciben 10% como premio de consolación
   */
  private static async calculateRace(
    task: any,
    submission: any,
    basePoints: number
  ): Promise<QPCCalculationResult> {
    const raceLimit = task.raceLimit || 3;
    const approvedCount = task.Submissions.length;

    // Verificar si aún hay cupo
    if (approvedCount < raceLimit) {
      const position = approvedCount + 1;
      return {
        shouldAwardPoints: true,
        pointsToAward: basePoints,
        reason: `¡Ganador de la carrera! Puesto #${position} de ${raceLimit}`,
        metadata: {
          logic: 'RACE',
          position,
          totalWinners: raceLimit,
          raceLimit
        }
      };
    } else {
      // Llegó tarde, premio de consolación (10%)
      const consolationPoints = Math.floor(basePoints * 0.1);
      return {
        shouldAwardPoints: true,
        pointsToAward: consolationPoints,
        reason: `Tarea aprobada pero fuera del límite de ${raceLimit} ganadores. Premio de consolación: ${consolationPoints} PC`,
        metadata: {
          logic: 'RACE',
          position: approvedCount + 1,
          totalWinners: raceLimit,
          raceLimit
        }
      };
    }
  }

  /**
   * GROUP_ALL: Nadie gana hasta que todo el grupo complete
   */
  private static async calculateGroupAll(
    task: any,
    userId: number,
    basePoints: number
  ): Promise<QPCCalculationResult> {
    // Obtener todos los usuarios del grupo/visión
    const groupUsers = await this.getGroupUsers(task.targetType, task.targetId);
    const totalUsers = groupUsers.length;

    // Contar cuántos han completado
    const completedCount = await prisma.taskSubmission.count({
      where: {
        adminTaskId: task.id,
        status: { in: ['APPROVED', 'SUBMITTED'] }
      }
    });

    const percentage = Math.round((completedCount / totalUsers) * 100);

    if (completedCount >= totalUsers) {
      return {
        shouldAwardPoints: true,
        pointsToAward: basePoints,
        reason: `¡Misión grupal completa! ${totalUsers}/${totalUsers} miembros completaron.`,
        metadata: {
          logic: 'GROUP_ALL',
          groupProgress: {
            completed: completedCount,
            total: totalUsers,
            percentage: 100
          }
        }
      };
    } else {
      return {
        shouldAwardPoints: false,
        pointsToAward: 0,
        reason: `Puntos en espera. El grupo debe completar 100%. Progreso: ${completedCount}/${totalUsers} (${percentage}%)`,
        metadata: {
          logic: 'GROUP_ALL',
          groupProgress: {
            completed: completedCount,
            total: totalUsers,
            percentage
          }
        }
      };
    }
  }

  /**
   * GROUP_THRESHOLD: X% del grupo debe completar (por defecto 70%)
   */
  private static async calculateGroupThreshold(
    task: any,
    userId: number,
    basePoints: number,
    threshold: number = 0.7
  ): Promise<QPCCalculationResult> {
    const groupUsers = await this.getGroupUsers(task.targetType, task.targetId);
    const totalUsers = groupUsers.length;
    const requiredCount = Math.ceil(totalUsers * threshold);

    const completedCount = await prisma.taskSubmission.count({
      where: {
        adminTaskId: task.id,
        status: { in: ['APPROVED', 'SUBMITTED'] }
      }
    });

    const percentage = Math.round((completedCount / totalUsers) * 100);

    if (completedCount >= requiredCount) {
      return {
        shouldAwardPoints: true,
        pointsToAward: basePoints,
        reason: `¡Umbral grupal alcanzado! ${completedCount}/${totalUsers} completaron (${percentage}%).`,
        metadata: {
          logic: 'GROUP_THRESHOLD',
          groupProgress: {
            completed: completedCount,
            total: totalUsers,
            percentage
          }
        }
      };
    } else {
      return {
        shouldAwardPoints: false,
        pointsToAward: 0,
        reason: `Puntos en espera. Se requiere ${Math.round(threshold * 100)}% del grupo. Progreso: ${completedCount}/${totalUsers} (${percentage}%)`,
        metadata: {
          logic: 'GROUP_THRESHOLD',
          groupProgress: {
            completed: completedCount,
            total: totalUsers,
            percentage
          }
        }
      };
    }
  }

  /**
   * STRICT_DEADLINE: Solo paga puntos si se entregó a tiempo
   * Compara submission.submittedAt con task deadline
   */
  private static calculateStrictDeadline(
    task: any,
    submission: any,
    basePoints: number
  ): QPCCalculationResult {
    if (!task.fechaLimite) {
      // Sin deadline, aplica lógica estándar
      return this.calculateStandard(basePoints);
    }

    // Construir deadline completo (fecha + hora)
    const deadlineDate = new Date(task.fechaLimite);
    if (task.horaEvento) {
      const [hours, minutes] = task.horaEvento.split(':');
      deadlineDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      deadlineDate.setHours(23, 59, 59, 999);
    }

    const submittedAt = new Date(submission.submittedAt);
    const isLate = submittedAt > deadlineDate;

    if (isLate) {
      const diffMs = submittedAt.getTime() - deadlineDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        shouldAwardPoints: false,
        pointsToAward: 0,
        reason: `Entrega tardía. Se subió ${diffHours}h ${diffMinutes}m después del límite. La disciplina requiere precisión.`,
        metadata: {
          logic: 'STRICT_DEADLINE',
          lateSubmission: true,
          deadline: deadlineDate.toISOString(),
          submittedAt: submittedAt.toISOString()
        }
      };
    } else {
      return {
        shouldAwardPoints: true,
        pointsToAward: basePoints,
        reason: 'Impecable. Entrega a tiempo. Puntos acreditados.',
        metadata: {
          logic: 'STRICT_DEADLINE',
          lateSubmission: false,
          deadline: deadlineDate.toISOString(),
          submittedAt: submittedAt.toISOString()
        }
      };
    }
  }

  /**
   * Helper: Obtener usuarios de un grupo/visión
   */
  private static async getGroupUsers(targetType: string, targetId: number | null): Promise<any[]> {
    if (targetType === 'ALL') {
      return await prisma.usuario.findMany({
        where: {
          rol: { in: ['PARTICIPANTE', 'GAMECHANGER'] },
          isActive: true
        }
      });
    } else if (targetType === 'GROUP' && targetId) {
      return await prisma.usuario.findMany({
        where: {
          vision: targetId.toString(),
          rol: { in: ['PARTICIPANTE', 'GAMECHANGER'] },
          isActive: true
        }
      });
    }
    return [];
  }

  /**
   * Pre-cálculo: Muestra al mentor cuántos puntos se otorgarán ANTES de aprobar
   * Útil para el feedback en la UI de revisión
   */
  static async preCalculatePoints(
    submissionId: number,
    taskId: number,
    userId: number
  ): Promise<QPCCalculationResult> {
    return this.calculatePoints(submissionId, taskId, userId);
  }
}
