import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProductLevelType, TrainingType } from '@prisma/client';
import logger from '@/lib/logger';

const ADMIN_ROLES = ['TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * GET /api/gc-calls/today-stats
 * Obtiene estadísticas de llamadas del día para el widget del dashboard
 * Query: level (BASIC|ADVANCED) - opcional, filtra por tipo de entrenamiento
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || !ADMIN_ROLES.includes(user.rol || '')) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level'); // BASIC o ADVANCED

    // Fecha de hoy (inicio y fin del día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Obtener productos activos de la organización según el nivel
    const activeProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: user.organizationId!,
        isActive: true,
        ...(level && { levelType: level as ProductLevelType }),
      },
      select: { id: true, visionId: true, levelType: true },
    });

    const productIds = activeProducts.map(p => p.id);
    const visionIds = activeProducts.map(p => p.visionId).filter(Boolean) as number[];

    if (productIds.length === 0 || visionIds.length === 0) {
      return NextResponse.json({
        success: true,
        completed: 0,
        total: 0,
        pending: 0,
      });
    }

    // ========== NUEVO: Obtener stats de BasicCallTracking (sistema de call-management) ==========
    // Buscar enrollments del nivel especificado con su tracking info
    const enrollmentsWithTracking = await prisma.vision_enrollments.findMany({
      where: {
        visionId: { in: visionIds },
        level: level as 'BASIC' | 'ADVANCED' | 'PL',
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
      },
      include: {
        BasicCallTracking: true,
      },
    });

    // Contar totales y completados del BasicCallTracking
    const totalCallTrackingParticipants = enrollmentsWithTracking.length;
    const completedCallTracking = enrollmentsWithTracking.filter(
      e => e.BasicCallTracking?.attendanceStatus === 'CONFIRMED' || 
           e.BasicCallTracking?.attendanceStatus === 'COMPLETED'
    ).length;

    // Si hay datos de BasicCallTracking, usar esos como fuente principal
    if (totalCallTrackingParticipants > 0) {
      logger.debug('[today-stats] Using BasicCallTracking data:', { 
        level, 
        total: totalCallTrackingParticipants, 
        completed: completedCallTracking 
      });
      
      // Obtener el visionId principal (el primero de los productos activos del nivel)
      const primaryVisionId = activeProducts.find(p => p.levelType === level)?.visionId || visionIds[0];
      
      return NextResponse.json({
        success: true,
        completed: completedCallTracking,
        total: totalCallTrackingParticipants,
        pending: totalCallTrackingParticipants - completedCallTracking,
        visionId: primaryVisionId,
        source: 'BasicCallTracking',
      });
    }

    // ========== Fallback: usar el sistema antiguo de GCCallSlot/GCCallLog ==========
    // Si se filtra por nivel ADVANCED, obtener usuarios con enrollment activo/pagado en avanzado
    let participantFilter: { participantId?: { in: number[] } } = {};
    
    if (level === 'ADVANCED') {
      // Primero obtener usuarios con tickets ADVANCED pagados
      const usersWithPaidAdvancedTickets = await prisma.ticket.findMany({
        where: {
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          level: 'ADVANCED',
          visionId: { in: visionIds },
          organizationId: user.organizationId!,
        },
        select: { ownerId: true },
      });
      
      const paidUserIds = usersWithPaidAdvancedTickets.map((t) => t.ownerId);
      
      // Filtrar los que también tienen enrollment activo en avanzado
      const advancedEnrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: { in: visionIds },
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
          level: 'ADVANCED',
          userId: { in: paidUserIds },
        },
        select: { userId: true },
      });
      
      const advancedUserIds = advancedEnrollments.map((e) => e.userId);
      
      if (advancedUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          completed: 0,
          total: 0,
          pending: 0,
        });
      }
      
      participantFilter = { participantId: { in: advancedUserIds } };
    }

    // Contar llamadas totales programadas para hoy (GCCallSlot)
    const totalSlots = await prisma.gCCallSlot.count({
      where: {
        availability: {
          gameChanger: {
            organizationId: user.organizationId!,
          },
        },
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'] },
        ...participantFilter,
      },
    });

    // Contar llamadas completadas hoy
    const completedSlots = await prisma.gCCallSlot.count({
      where: {
        availability: {
          gameChanger: {
            organizationId: user.organizationId!,
          },
        },
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: 'COMPLETED',
        ...participantFilter,
      },
    });

    // También contar llamadas de GCCallLog del día
    // Filtrar por trainingType si se especifica level
    const logTrainingTypeFilter = level ? { trainingType: level as TrainingType } : {};
    
    const totalLogs = await prisma.gCCallLog.count({
      where: {
        gameChanger: {
          organizationId: user.organizationId!,
        },
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        ...logTrainingTypeFilter,
        ...(participantFilter.participantId ? { participantId: { in: participantFilter.participantId.in } } : {}),
      },
    });

    const completedLogs = await prisma.gCCallLog.count({
      where: {
        gameChanger: {
          organizationId: user.organizationId!,
        },
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        callStatus: 'ANSWERED',
        ...logTrainingTypeFilter,
        ...(participantFilter.participantId ? { participantId: { in: participantFilter.participantId.in } } : {}),
      },
    });

    const total = totalSlots + totalLogs;
    const completed = completedSlots + completedLogs;

    return NextResponse.json({
      success: true,
      completed,
      total,
      pending: total - completed,
      breakdown: {
        slots: { total: totalSlots, completed: completedSlots },
        logs: { total: totalLogs, completed: completedLogs },
      },
    });
  } catch (error) {
    logger.error('Error fetching today stats:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
