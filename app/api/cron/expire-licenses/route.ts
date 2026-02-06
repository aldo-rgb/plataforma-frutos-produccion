import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/cron/expire-licenses
 * 
 * Cron job que se ejecuta diariamente para:
 * 1. Identificar licencias no activadas después de 10 días
 * 2. Desactivar usuarios
 * 3. Recuperar licencia a la organización
 * 4. Crear notificación para el director
 * 
 * Configurar en Vercel Cron o ejecutar manualmente
 */
export async function GET(req: Request) {
  try {
    // Verificar secret key para seguridad
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const now = new Date();

    // Buscar licencias expiradas (no activadas y pasaron 10 días)
    const expiredAssignments = await prisma.licenseAssignment.findMany({
      where: {
        isActive: true,
        activatedAt: null, // No fue activada
        expiresAt: {
          lte: now // Ya pasó la fecha de expiración
        }
      },
      include: {
        User: {
          select: {
            id: true,
            nombre: true,
            email: true,
            organizationId: true
          }
        },
        Organization: {
          select: {
            id: true,
            name: true,
            schoolAdminId: true
          }
        },
        License: {
          select: {
            code: true,
            tierAssigned: true
          }
        }
      }
    });

    if (expiredAssignments.length === 0) {
      logger.cron('No hay licencias expiradas');
      return NextResponse.json({
        success: true,
        message: 'No hay licencias expiradas',
        processed: 0
      });
    }

    logger.cron(`Encontradas ${expiredAssignments.length} licencias expiradas`);

    const results = [];

    for (const assignment of expiredAssignments) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Desactivar el usuario
          await tx.usuario.update({
            where: { id: assignment.userId },
            data: { 
              isActive: false,
              tier: 'FREE' // Bajar a FREE
            }
          });

          // 2. Marcar la licencia como inactiva
          await tx.licenseAssignment.update({
            where: { id: assignment.id },
            data: { isActive: false }
          });

          // 3. Recuperar la licencia a la organización
          await tx.organization.update({
            where: { id: assignment.organizationId },
            data: {
              activeLicenses: { decrement: 1 }
            }
          });

          // 4. Incrementar usos disponibles de la licencia
          await tx.license.update({
            where: { code: assignment.licenseCode },
            data: {
              usesRemaining: { increment: 1 }
            }
          });

          // 5. Crear notificación para el director
          await tx.notificacion.create({
            data: {
              usuarioId: assignment.Organization.schoolAdminId,
              tipo: 'LICENSE_EXPIRED',
              titulo: '⚠️ Licencia recuperada por inactividad',
              mensaje: `El usuario "${assignment.User.nombre}" (${assignment.User.email}) no completó su wizard en 10 días. La licencia ha sido recuperada y está disponible para asignar.`,
              leida: false,
              url: `/school-admin/organizacion` // Ir a gestión de licencias
            }
          });

          logger.cron(`Licencia recuperada de usuario: ${assignment.User.email}`);
        });

        results.push({
          userId: assignment.userId,
          userName: assignment.User.nombre,
          email: assignment.User.email,
          licenseCode: assignment.licenseCode,
          status: 'recovered'
        });

      } catch (error) {
        logger.error(`Error procesando licencia ${assignment.id}`, error);
        results.push({
          status: 'error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Procesadas ${expiredAssignments.length} licencias expiradas`,
      processed: results.filter(r => r.status === 'recovered').length
    });

  } catch (error) {
    logger.error('Error en cron de licencias expiradas', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
