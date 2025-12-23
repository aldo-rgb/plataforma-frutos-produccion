/**
 * MOTOR DE RECOMPENSAS - Quantum Points & Experience Engine
 * 
 * Este motor calcula y otorga recompensas de manera equilibrada
 * basándose en la "Ley del Esfuerzo Relativo"
 */

import { prisma } from '@/lib/prisma';
// Usar type de TaskRarity directamente
type TaskRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

import { 
  RECOMPENSAS_POR_RAREZA, 
  BONUS_DIA_PERFECTO,
  getNivelPorXP,
  getMensajeMotivacional,
  calcularRarezaPorFrecuencia
} from './rewardSystem';

export interface RecompensaResult {
  xpGanado: number;
  pcGanado: number;
  nivelAnterior: number;
  nivelNuevo: number;
  subioDeNivel: boolean;
  mensaje: string;
  bonusDiaPerfecto?: boolean;
  rarezaTarea: TaskRarity;
}

/**
 * Otorga recompensas por completar una evidencia de tarea de CARTA
 */
export async function otorgarRecompensaPorEvidencia(
  usuarioId: number,
  evidenciaId: number,
  accionId: number
): Promise<RecompensaResult> {
  
  // 1. Obtener información del usuario y la acción
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      nombre: true,
      experienciaXP: true,
      puntosCuanticos: true,
      nivelActual: true,
      lastCompletionDate: true,
      completionStreak: true
    }
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  const accion = await prisma.accion.findUnique({
    where: { id: accionId },
    select: {
      id: true,
      texto: true,
      frequency: true,
      rarity: true
    }
  });

  if (!accion) {
    throw new Error('Acción no encontrada');
  }

  // 2. Determinar rareza (usar la configurada o calcular automáticamente)
  const rareza: TaskRarity = accion.rarity || calcularRarezaPorFrecuencia(accion.frequency || 'DAILY');

  // 3. Obtener recompensa base según rareza
  const recompensaBase = RECOMPENSAS_POR_RAREZA[rareza];

  // 4. Calcular nivel anterior
  const nivelAnterior = getNivelPorXP(usuario.experienciaXP);

  // 5. Otorgar XP y PC
  const nuevoXP = usuario.experienciaXP + recompensaBase.xp;
  const nuevoPC = usuario.puntosCuanticos + recompensaBase.pc;

  // 6. Calcular nuevo nivel
  const nivelNuevo = getNivelPorXP(nuevoXP);
  const subioDenivel = nivelNuevo.nivel > nivelAnterior.nivel;

  // 7. Actualizar racha
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const lastCompletion = usuario.lastCompletionDate ? new Date(usuario.lastCompletionDate) : null;
  let nuevaRacha = usuario.completionStreak;
  
  if (lastCompletion) {
    lastCompletion.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((hoy.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias === 1) {
      // Día consecutivo
      nuevaRacha += 1;
    } else if (diffDias > 1) {
      // Se rompió la racha
      nuevaRacha = 1;
    }
    // Si diffDias === 0, ya completó algo hoy, mantener racha
  } else {
    nuevaRacha = 1;
  }

  // 8. Actualizar usuario
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      experienciaXP: nuevoXP,
      puntosCuanticos: nuevoPC,
      nivelActual: nivelNuevo.nivel,
      rangoActual: nivelNuevo.rango,
      lastCompletionDate: new Date(),
      completionStreak: nuevaRacha
    }
  });

  // 9. Registrar en historial
  await prisma.rewardHistory.create({
    data: {
      usuarioId: usuarioId,
      type: 'XP',
      amount: recompensaBase.xp,
      reason: recompensaBase.razon,
      sourceType: 'EVIDENCE',
      sourceId: evidenciaId,
      rarity: rareza
    }
  });

  await prisma.rewardHistory.create({
    data: {
      usuarioId: usuarioId,
      type: 'PC',
      amount: recompensaBase.pc,
      reason: recompensaBase.razon,
      sourceType: 'EVIDENCE',
      sourceId: evidenciaId,
      rarity: rareza
    }
  });

  // 10. Generar mensaje motivacional
  const mensaje = getMensajeMotivacional(rareza, usuario.nombre);

  return {
    xpGanado: recompensaBase.xp,
    pcGanado: recompensaBase.pc,
    nivelAnterior: nivelAnterior.nivel,
    nivelNuevo: nivelNuevo.nivel,
    subioDeNivel: subioDenivel,
    mensaje,
    rarezaTarea: rareza
  };
}

/**
 * Verifica y otorga el bonus de día perfecto
 */
export async function verificarYOtorgarBonusDiaPerfecto(usuarioId: number, fecha: Date): Promise<{ otorgado: boolean; pcGanados: number }> {
  
  // Establecer rango del día
  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);
  
  const finDia = new Date(fecha);
  finDia.setHours(23, 59, 59, 999);

  // Contar tareas programadas para hoy
  const tareasProgramadas = await prisma.taskInstance.count({
    where: {
      usuarioId: usuarioId,
      dueDate: {
        gte: inicioDia,
        lte: finDia
      }
    }
  });

  // Contar tareas completadas
  const tareasCompletadas = await prisma.taskInstance.count({
    where: {
      usuarioId: usuarioId,
      dueDate: {
        gte: inicioDia,
        lte: finDia
      },
      status: 'COMPLETED'
    }
  });

  // Verificar si ya se otorgó el bonus hoy
  const bonusYaOtorgado = await prisma.rewardHistory.findFirst({
    where: {
      usuarioId: usuarioId,
      reason: BONUS_DIA_PERFECTO.razon,
      createdAt: {
        gte: inicioDia,
        lte: finDia
      }
    }
  });

  // Si no hay tareas programadas o ya se otorgó el bonus, no hacer nada
  if (tareasProgramadas === 0 || bonusYaOtorgado) {
    return { otorgado: false, pcGanados: 0 };
  }

  // Verificar si completó el 100%
  const porcentajeCompletado = (tareasCompletadas / tareasProgramadas) * 100;

  if (porcentajeCompletado === 100) {
    // Otorgar bonus
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        puntosCuanticos: {
          increment: BONUS_DIA_PERFECTO.pc
        }
      }
    });

    // Registrar en historial
    await prisma.rewardHistory.create({
      data: {
        usuarioId: usuarioId,
        type: 'PC',
        amount: BONUS_DIA_PERFECTO.pc,
        reason: BONUS_DIA_PERFECTO.razon,
        sourceType: 'DAILY_BONUS',
        sourceId: null
      }
    });

    return { otorgado: true, pcGanados: BONUS_DIA_PERFECTO.pc };
  }

  return { otorgado: false, pcGanados: 0 };
}

/**
 * Otorga recompensa por tarea extraordinaria
 */
export async function otorgarRecompensaPorTareaExtraordinaria(
  usuarioId: number,
  submissionId: number,
  puntosAsignados: number
): Promise<{ xpGanado: number; pcGanado: number; mensaje: string }> {
  
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      nombre: true,
      experienciaXP: true
    }
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  // Tareas extraordinarias siempre son LEGENDARY
  const rareza: TaskRarity = 'LEGENDARY';
  const recompensa = RECOMPENSAS_POR_RAREZA[rareza];

  // Usar los puntos configurados por el admin o los default
  const pcFinal = puntosAsignados || recompensa.pc;

  // Otorgar recompensas
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      experienciaXP: {
        increment: recompensa.xp
      },
      puntosCuanticos: {
        increment: pcFinal
      }
    }
  });

  // Registrar en historial
  await prisma.rewardHistory.createMany({
    data: [
      {
        usuarioId: usuarioId,
        type: 'XP',
        amount: recompensa.xp,
        reason: 'Misión Especial Completada',
        sourceType: 'TASK',
        sourceId: submissionId,
        rarity: rareza
      },
      {
        usuarioId: usuarioId,
        type: 'PC',
        amount: pcFinal,
        reason: 'Misión Especial Completada',
        sourceType: 'TASK',
        sourceId: submissionId,
        rarity: rareza
      }
    ]
  });

  const mensaje = getMensajeMotivacional(rareza, usuario.nombre);

  return {
    xpGanado: recompensa.xp,
    pcGanado: pcFinal,
    mensaje
  };
}

/**
 * Obtiene el progreso de colecciones del usuario
 */
export async function obtenerProgresoColecciones(usuarioId: number) {
  const colecciones = await prisma.userCollectionProgress.findMany({
    where: { usuarioId },
    include: {
      Collection: true
    }
  });

  return colecciones;
}

/**
 * Verifica y completa colecciones automáticamente
 */
export async function verificarColecciones(usuarioId: number) {
  // Implementar lógica de verificación de colecciones
  // Esto se puede ejecutar periódicamente o al completar tareas
  
  // Por ahora, dejar como placeholder para implementación futura
  return [];
}
