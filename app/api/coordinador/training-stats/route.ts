import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/coordinador/training-stats
 * Obtiene estadísticas del entrenamiento en curso de la organización
 * - Total de participantes en productos activos
 * - Pre-registros pendientes y pagados
 * - Llamadas pendientes del día
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario y su organización
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        organizationId: true,
        rol: true
      }
    });

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 404 });
    }

    // Verificar rol de coordinador (todos los tipos)
    const allowedRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'SCHOOL_ADMIN', 'TRAINER'];
    if (!allowedRoles.includes(user.rol || '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const orgId = user.organizationId;
    console.log('[training-stats] User:', user.id, 'OrgId:', orgId, 'Rol:', user.rol);

    // Obtener productos activos de la organización (BASIC y ADVANCED en curso)
    const activeProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        levelType: {
          in: ['BASIC', 'ADVANCED']
        }
      },
      select: {
        id: true,
        name: true,
        levelType: true,
        startDate: true,
        endDate: true,
        visionId: true
      }
    });

    const productIds = activeProducts.map(p => p.id);
    const visionIds = activeProducts.filter(p => p.visionId).map(p => p.visionId as number);

    // Contar participantes totales en las visiones asociadas (enrollments activos)
    const totalParticipants = await prisma.vision_enrollments.count({
      where: {
        visionId: {
          in: visionIds
        },
        enrollmentStatus: {
          in: ['ENROLLED', 'ACTIVE']
        }
      }
    });

    // Contar participantes inscritos (ENROLLED o ACTIVE) - estos son los que ya pagaron y están en el entrenamiento
    // Contamos todos los que tienen ENROLLED o ACTIVE porque ya están en el sistema
    const inscritosCount = await prisma.vision_enrollments.count({
      where: {
        visionId: {
          in: visionIds
        },
        enrollmentStatus: {
          in: ['ENROLLED', 'ACTIVE']
        }
      }
    });

    // Contar pre-registros por estado (declarados para avanzado)
    const preRegistroStats = await prisma.advancedPreRegistration.groupBy({
      by: ['status'],
      where: {
        currentProductId: {
          in: productIds
        }
      },
      _count: {
        id: true
      }
    });

    // Procesar estadísticas de pre-registro
    const preRegistros = {
      pending: 0,
      paid: inscritosCount, // Usar enrollments inscritos como "pagados/inscritos"
      expired: 0,
      cancelled: 0,
      total: 0
    };

    console.log('[training-stats] ProductIds:', productIds, 'VisionIds:', visionIds, 'TotalParticipants:', totalParticipants, 'InscritosCount:', inscritosCount);

    preRegistroStats.forEach(stat => {
      const count = stat._count.id;
      preRegistros.total += count;
      switch (stat.status) {
        case 'PENDING':
          preRegistros.pending = count;
          break;
        case 'PAID':
          preRegistros.paid = count;
          break;
        case 'EXPIRED':
          preRegistros.expired = count;
          break;
        case 'CANCELLED':
          preRegistros.cancelled = count;
          break;
      }
    });

    // Contar llamadas pendientes del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Obtener los participantes de visiones activas para filtrar llamadas
    const participantIds = await prisma.vision_enrollments.findMany({
      where: {
        visionId: {
          in: visionIds
        },
        enrollmentStatus: 'ENROLLED'
      },
      select: {
        userId: true
      }
    });

    const userIds = participantIds.map(p => p.userId);

    // Contar llamadas GC pendientes de hoy
    const pendingCallsToday = await prisma.gCCallSlot.count({
      where: {
        participantId: {
          in: userIds
        },
        scheduledDate: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      }
    });

    // Total de llamadas del día (incluyendo completadas)
    const totalCallsToday = await prisma.gCCallSlot.count({
      where: {
        participantId: {
          in: userIds
        },
        scheduledDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        community: {
          total: totalParticipants,
          products: activeProducts.length
        },
        preRegistros: {
          total: preRegistros.total,
          pending: preRegistros.pending,
          paid: preRegistros.paid,
          expired: preRegistros.expired,
          cancelled: preRegistros.cancelled
        },
        calls: {
          pending: pendingCallsToday,
          total: totalCallsToday
        },
        activeProducts: activeProducts.map(p => ({
          id: p.id,
          name: p.name,
          levelType: p.levelType
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching training stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
