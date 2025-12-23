/**
 * SISTEMA DE VERIFICACIÓN AUTOMÁTICA DE SETS Y COLECCIONES
 * The Quantum Archive - Collection Verification Engine
 */

import { prisma } from './prisma';
import { COLECCIONES } from './rewardSystem';

interface CollectionProgress {
  coleccionId: string;
  completada: boolean;
  progreso: number;
  total: number;
  recompensaPC: number;
  mensaje?: string;
}

/**
 * Verifica automáticamente si un usuario completó alguna colección
 * después de aprobar una evidencia
 */
export async function verificarColecciones(
  usuarioId: number
): Promise<CollectionProgress[]> {
  const coleccionesCompletadas: CollectionProgress[] = [];

  try {
    // Obtener todas las evidencias aprobadas del usuario
    const evidencias = await prisma.evidenciaAccion.findMany({
      where: {
        usuarioId,
        estado: 'APROBADA'
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      },
      orderBy: {
        fechaSubida: 'asc'
      }
    });

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        completionStreak: true,
        collectionsCompleted: true,
        nivelActual: true
      }
    });

    if (!usuario) return [];

    // Verificar cada colección
    for (const coleccion of COLECCIONES) {
      // Saltar si ya fue completada
      if (usuario.collectionsCompleted.includes(coleccion.id)) {
        continue;
      }

      let cumpleRequisitos = false;
      let progreso = 0;
      let total = coleccion.requisito;

      switch (coleccion.id) {
        // ⭐ GUERRERO DEL ALBA: 5 evidencias antes de las 7AM
        case 'guerrero-alba':
          const evidencias5AM = evidencias.filter(ev => {
            const hora = new Date(ev.fechaSubida).getHours();
            return hora >= 5 && hora < 7;
          });
          progreso = evidencias5AM.length;
          cumpleRequisitos = progreso >= 5;
          break;

        // 💪 TITÁN DE ACERO: 30 evidencias de gym
        case 'titan-acero':
          const evidenciasGym = evidencias.filter(ev => 
            ev.Accion.Meta.categoria === 'SALUD' &&
            (ev.Accion.texto.toLowerCase().includes('gym') ||
             ev.Accion.texto.toLowerCase().includes('ejercicio') ||
             ev.Accion.texto.toLowerCase().includes('gimnasio'))
          );
          progreso = evidenciasGym.length;
          cumpleRequisitos = progreso >= 30;
          break;

        // 📚 LECTOR SILENCIOSO: 10 evidencias de lectura
        case 'lector-silencioso':
          const evidenciasLectura = evidencias.filter(ev =>
            ev.Accion.texto.toLowerCase().includes('leer') ||
            ev.Accion.texto.toLowerCase().includes('lectura') ||
            ev.Accion.texto.toLowerCase().includes('libro')
          );
          progreso = evidenciasLectura.length;
          cumpleRequisitos = progreso >= 10;
          break;

        // 🔥 SEMANA PERFECTA: 7 días perfectos seguidos
        case 'semana-perfecta':
          // Obtener datos de días perfectos (requiere implementación en otra parte)
          // Por ahora, verificamos si tiene 7+ días de streak
          progreso = usuario.completionStreak;
          cumpleRequisitos = progreso >= 7;
          total = 7;
          break;

        // 🏛️ EL CURADOR: 100 artefactos totales
        case 'el-curador':
          progreso = evidencias.length;
          cumpleRequisitos = progreso >= 100;
          total = 100;
          break;

        // ⚔️ RACHA DE HIERRO: 30 días de streak
        case 'racha-hierro':
          progreso = usuario.completionStreak;
          cumpleRequisitos = progreso >= 30;
          total = 30;
          break;

        // 👑 GUARDIÁN SUPREMO: Alcanzar nivel 10
        case 'guardian-supremo':
          progreso = usuario.nivelActual;
          cumpleRequisitos = progreso >= 10;
          total = 10;
          break;
      }

      if (cumpleRequisitos) {
        // Otorgar la colección
        await prisma.usuario.update({
          where: { id: usuarioId },
          data: {
            collectionsCompleted: {
              push: coleccion.id
            },
            puntosCuanticos: {
              increment: coleccion.recompensaPC
            }
          }
        });

        // Registrar en historial
        await prisma.rewardHistory.create({
          data: {
            usuarioId,
            type: 'PC',
            amount: coleccion.recompensaPC,
            reason: `Colección completada: ${coleccion.nombre}`,
            sourceType: 'COLLECTION',
            sourceId: null
          }
        });

        coleccionesCompletadas.push({
          coleccionId: coleccion.id,
          completada: true,
          progreso,
          total,
          recompensaPC: coleccion.recompensaPC,
          mensaje: `🎉 ¡Colección "${coleccion.nombre}" completada! +${coleccion.recompensaPC} PC`
        });

        console.log(`✨ ${coleccion.icono} Colección completada: ${coleccion.nombre} (+${coleccion.recompensaPC} PC)`);
      }
    }

    return coleccionesCompletadas;

  } catch (error) {
    console.error('Error al verificar colecciones:', error);
    return [];
  }
}

/**
 * Obtiene el progreso actual de todas las colecciones
 */
export async function obtenerProgresoColecciones(
  usuarioId: number
): Promise<CollectionProgress[]> {
  const progresosColecciones: CollectionProgress[] = [];

  try {
    const evidencias = await prisma.evidenciaAccion.findMany({
      where: {
        usuarioId,
        estado: 'APROBADA'
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      }
    });

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        completionStreak: true,
        collectionsCompleted: true,
        nivelActual: true
      }
    });

    if (!usuario) return [];

    for (const coleccion of COLECCIONES) {
      let progreso = 0;
      let total = coleccion.requisito;
      const completada = usuario.collectionsCompleted.includes(coleccion.id);

      switch (coleccion.id) {
        case 'guerrero-alba':
          progreso = evidencias.filter(ev => {
            const hora = new Date(ev.fechaSubida).getHours();
            return hora >= 5 && hora < 7;
          }).length;
          break;

        case 'titan-acero':
          progreso = evidencias.filter(ev =>
            ev.Accion.Meta.categoria === 'SALUD' &&
            (ev.Accion.texto.toLowerCase().includes('gym') ||
             ev.Accion.texto.toLowerCase().includes('ejercicio'))
          ).length;
          break;

        case 'lector-silencioso':
          progreso = evidencias.filter(ev =>
            ev.Accion.texto.toLowerCase().includes('leer') ||
            ev.Accion.texto.toLowerCase().includes('libro')
          ).length;
          break;

        case 'semana-perfecta':
          progreso = usuario.completionStreak;
          total = 7;
          break;

        case 'el-curador':
          progreso = evidencias.length;
          total = 100;
          break;

        case 'racha-hierro':
          progreso = usuario.completionStreak;
          total = 30;
          break;

        case 'guardian-supremo':
          progreso = usuario.nivelActual;
          total = 10;
          break;
      }

      progresosColecciones.push({
        coleccionId: coleccion.id,
        completada,
        progreso: Math.min(progreso, total),
        total,
        recompensaPC: coleccion.recompensaPC
      });
    }

    return progresosColecciones;

  } catch (error) {
    console.error('Error al obtener progreso de colecciones:', error);
    return [];
  }
}
