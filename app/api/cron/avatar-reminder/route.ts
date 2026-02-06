import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/cron/avatar-reminder
 * Cron job que envía notificaciones mensuales recordando a usuarios que pueden cambiar su avatar
 * Se ejecuta diariamente y verifica usuarios que cumplieron 30 días desde el último cambio
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación del cron (opcional)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.debug('🤖 [CRON] Iniciando verificación de recordatorios de avatar...');

    // Calcular fecha hace 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar usuarios que:
    // 1. Tienen avatar (profileImage no null)
    // 2. Han pasado 30+ días desde el último cambio
    // 3. No tienen notificación activa de este tipo
    const usuarios: any = await prisma.usuario.findMany({
      where: {
        profileImage: { not: null },
        OR: [
          {
            lastAvatarChangeDate: {
              lte: thirtyDaysAgo
            }
          } as any,
          {
            lastAvatarChangeDate: null
          } as any
        ]
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        lastAvatarChangeDate: true
      } as any
    });

    logger.debug(`📊 [CRON] Encontrados ${usuarios.length} usuarios elegibles para recordatorio`);

    let notificacionesCreadas = 0;

    for (const usuario of usuarios) {
      // Verificar si ya tiene notificación activa de este tipo
      const notificacionExistente = await prisma.notification.findFirst({
        where: {
          userId: usuario.id,
          type: 'AVATAR_RENEWAL_REMINDER' as any,
          isRead: false
        }
      });

      if (notificacionExistente) {
        logger.debug(`⏭️ [CRON] Usuario ${usuario.id} ya tiene notificación activa, omitiendo...`);
        continue;
      }

      // Crear notificación
      await prisma.notification.create({
        data: {
          userId: usuario.id,
          type: 'AVATAR_RENEWAL_REMINDER' as any,
          title: '✨ Renueva tu Avatar Cuántico',
          message: '¡Ya puedes actualizar tu avatar cuántico! Ha pasado un mes desde tu último cambio. Visita tu perfil para generar una nueva identidad visual que refleje tu evolución personal.',
          isRead: false
        }
      });

      notificacionesCreadas++;
      logger.debug(`✅ [CRON] Notificación creada para usuario ${usuario.id} (${usuario.nombre})`);
    }

    logger.debug(`✅ [CRON] Proceso completado: ${notificacionesCreadas} notificaciones creadas`);

    return NextResponse.json({
      success: true,
      usuariosElegibles: usuarios.length,
      notificacionesCreadas: notificacionesCreadas,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('❌ [CRON] Error en recordatorio de avatares:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al procesar recordatorios'
      },
      { status: 500 }
    );
  }
}
