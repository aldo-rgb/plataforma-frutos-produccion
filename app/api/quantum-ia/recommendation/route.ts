import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/quantum-ia/recommendation
 * Genera una recomendación personalizada para el usuario basada en su actividad
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Obtener datos del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        Carta: {
          include: {
            Meta: true
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener tareas de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const tareasHoy = await prisma.taskInstance.count({
      where: {
        usuarioId: userId,
        scheduledDate: {
          gte: hoy,
          lt: mañana
        },
        status: 'PENDING'
      }
    });

    // Obtener tareas retrasadas
    const tareasRetrasadas = await prisma.taskInstance.count({
      where: {
        usuarioId: userId,
        scheduledDate: {
          lt: hoy
        },
        status: 'PENDING'
      }
    });

    // Obtener evidencias pendientes
    const evidenciasPendientes = await prisma.taskSubmission.count({
      where: {
        usuarioId: userId,
        status: 'PENDING'
      }
    });

    // Verificar estado de la carta
    const cartaEstado = usuario.Carta?.[0]?.estado;
    const tieneMetas = usuario.Carta?.[0]?.Meta?.length || 0;

    // Generar recomendación basada en prioridades
    let message = '';
    let emoji = '💡';

    // Prioridad 1: Carta sin crear o en borrador
    if (!usuario.Carta || usuario.Carta.length === 0) {
      message = 'Crea tu Carta F.R.U.T.O.S. para comenzar a ganar puntos y definir tus objetivos ✨';
      emoji = '🎯';
    } else if (cartaEstado === 'BORRADOR' || tieneMetas === 0) {
      message = 'Completa tu Carta F.R.U.T.O.S. con metas claras para desbloquear todo tu potencial 🚀';
      emoji = '📝';
    }
    // Prioridad 2: Carta en revisión o cambios requeridos
    else if (cartaEstado === 'EN_REVISION') {
      message = 'Tu carta está en revisión. Mientras tanto, sigue ejecutando y ganando puntos 💪';
      emoji = '⏳';
    } else if (cartaEstado === 'CAMBIOS_REQUERIDOS') {
      message = 'Tu mentor solicitó cambios en tu carta. Corrígelos para continuar tu progreso 🔧';
      emoji = '⚠️';
    }
    // Prioridad 3: Tareas retrasadas
    else if (tareasRetrasadas > 0) {
      message = `Tienes ${tareasRetrasadas} tarea${tareasRetrasadas > 1 ? 's' : ''} retrasada${tareasRetrasadas > 1 ? 's' : ''}. Recupéralas para no perder impulso 🔥`;
      emoji = '⚡';
    }
    // Prioridad 4: Tareas pendientes de hoy
    else if (tareasHoy > 0) {
      message = `¡Buen ritmo! Completa tus ${tareasHoy} tarea${tareasHoy > 1 ? 's' : ''} de hoy para sumar más puntos 🎯`;
      emoji = '✅';
    }
    // Prioridad 5: Evidencias pendientes
    else if (evidenciasPendientes > 0) {
      message = `Tienes ${evidenciasPendientes} evidencia${evidenciasPendientes > 1 ? 's' : ''} en revisión. Tu mentor las validará pronto 👀`;
      emoji = '📸';
    }
    // Default: Todo al día
    else {
      const motivationalMessages = [
        'Estás al día con todo. ¡Sigue así para mantener tu racha ganadora! 🌟',
        'Excelente trabajo. Busca nuevas oportunidades para seguir creciendo 🚀',
        '¡Impresionante! Mantén este nivel de consistencia para alcanzar tus metas 💎',
        'Todo completado. Revisa tus objetivos para encontrar nuevos desafíos 🎯',
        'Vas muy bien. Considera solicitar una mentoría para acelerar tu crecimiento 🧠'
      ];
      const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
      message = motivationalMessages[randomIndex];
      emoji = '🌟';
    }

    return NextResponse.json({
      message,
      emoji,
      stats: {
        tareasHoy,
        tareasRetrasadas,
        evidenciasPendientes,
        cartaEstado,
        tieneMetas: tieneMetas > 0
      }
    });

  } catch (error) {
    console.error('❌ Error generando recomendación de IA:', error);
    return NextResponse.json(
      { 
        message: 'Habla conmigo para obtener recomendaciones personalizadas 💬',
        emoji: '🤖'
      },
      { status: 200 } // Devolvemos mensaje por defecto en vez de error
    );
  }
}
