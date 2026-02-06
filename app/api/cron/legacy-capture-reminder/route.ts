import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// CRON Job: Notificar al GC el último día del entrenamiento
// para que capture los legados de los participantes.
// Se ejecuta diariamente a las 8 AM

export async function POST(request: NextRequest) {
  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'frutos-cron-secret-2026';

    if (authHeader !== `Bearer ${cronSecret}`) {
      const { searchParams } = new URL(request.url);
      const manualKey = searchParams.get('key');
      if (manualKey !== cronSecret) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = {
      notificationsSent: 0,
      visionesNotificadas: [] as string[],
      errors: [] as string[],
    };

    // Buscar visiones que terminan hoy
    const visionesUltimoDia = await prisma.vision.findMany({
      where: {
        fechaFin: {
          gte: today,
          lt: tomorrow,
        },
        status: 'IN_PROGRESS',
        gcId: {
          not: null,
        },
      },
      include: {
        gameChanger: {
          select: {
            id: true,
            nombreCompleto: true,
            email: true,
            telefono: true,
          },
        },
        school: {
          select: {
            nombre: true,
            organization: {
              select: {
                nombre: true,
              },
            },
          },
        },
        product: {
          select: {
            nombre: true,
          },
        },
        participantes: {
          select: {
            usuarioId: true,
          },
        },
      },
    });

    logger.debug(
      `[Legacy Capture CRON] Encontradas ${visionesUltimoDia.length} visiones que terminan hoy`
    );

    for (const vision of visionesUltimoDia) {
      if (!vision.gameChanger) continue;

      try {
        // Verificar si ya enviamos notificación hoy
        const notificacionExistente = await prisma.notification.findFirst({
          where: {
            userId: vision.gameChanger.id,
            type: 'LEGACY_CAPTURE_REMINDER',
            metadata: {
              path: ['visionId'],
              equals: vision.id,
            },
            createdAt: {
              gte: today,
            },
          },
        });

        if (notificacionExistente) {
          logger.debug(
            `[Legacy Capture CRON] Ya notificado: ${vision.nombre} a ${vision.gameChanger.nombreCompleto}`
          );
          continue;
        }

        // Contar capturas pendientes
        const capturasExistentes = await prisma.legacyCaptureSession.count({
          where: {
            visionId: vision.id,
            status: 'COMPLETE',
          },
        });

        const participantesPendientes =
          vision.participantes.length - capturasExistentes;

        // Crear notificación en la plataforma
        await prisma.notification.create({
          data: {
            userId: vision.gameChanger.id,
            type: 'LEGACY_CAPTURE_REMINDER',
            title: '📸 ¡Último día de entrenamiento!',
            message: `Hoy es el último día de "${vision.nombre}". Tienes ${participantesPendientes} participantes pendientes de captura de legado.`,
            actionUrl: `/dashboard/game-changer/legacy-capture?visionId=${vision.id}`,
            metadata: {
              visionId: vision.id,
              visionName: vision.nombre,
              totalParticipantes: vision.participantes.length,
              pendientes: participantesPendientes,
            },
            read: false,
          },
        });

        results.notificationsSent++;
        results.visionesNotificadas.push(
          `${vision.nombre} → ${vision.gameChanger.nombreCompleto} (${participantesPendientes} pendientes)`
        );

        logger.debug(
          `[Legacy Capture CRON] Notificación enviada a ${vision.gameChanger.nombreCompleto} para ${vision.nombre}`
        );

        // Opcional: Enviar notificación por WhatsApp si hay integración
        // await sendWhatsAppNotification(vision.gameChanger.telefono, message);
      } catch (error: any) {
        logger.error(
          `[Legacy Capture CRON] Error procesando visión ${vision.id}:`,
          error
        );
        results.errors.push(
          `Visión ${vision.id}: ${error.message || 'Error desconocido'}`
        );
      }
    }

    // También crear recordatorio para visiones que terminan mañana (pre-aviso)
    const manana = new Date(tomorrow);
    const pasadoManana = new Date(manana);
    pasadoManana.setDate(pasadoManana.getDate() + 1);

    const visionesManana = await prisma.vision.findMany({
      where: {
        fechaFin: {
          gte: manana,
          lt: pasadoManana,
        },
        status: 'IN_PROGRESS',
        gcId: {
          not: null,
        },
      },
      include: {
        gameChanger: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
      },
    });

    let preAvisos = 0;
    for (const vision of visionesManana) {
      if (!vision.gameChanger) continue;

      // Verificar si ya enviamos pre-aviso
      const preAvisoExistente = await prisma.notification.findFirst({
        where: {
          userId: vision.gameChanger.id,
          type: 'LEGACY_CAPTURE_PRE_REMINDER',
          metadata: {
            path: ['visionId'],
            equals: vision.id,
          },
        },
      });

      if (!preAvisoExistente) {
        await prisma.notification.create({
          data: {
            userId: vision.gameChanger.id,
            type: 'LEGACY_CAPTURE_PRE_REMINDER',
            title: '📅 Mañana es el último día',
            message: `Mañana es el último día de "${vision.nombre}". Prepara tu celular para capturar los legados de tus participantes.`,
            actionUrl: `/dashboard/game-changer/legacy-capture`,
            metadata: {
              visionId: vision.id,
              visionName: vision.nombre,
            },
            read: false,
          },
        });
        preAvisos++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results: {
        ...results,
        preAvisosMañana: preAvisos,
      },
      message: `Enviadas ${results.notificationsSent} notificaciones de último día y ${preAvisos} pre-avisos`,
    });
  } catch (error: any) {
    logger.error('[Legacy Capture CRON] Error general:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// GET para pruebas manuales
export async function GET(request: NextRequest) {
  return POST(request);
}
