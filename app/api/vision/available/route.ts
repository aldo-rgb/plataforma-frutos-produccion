import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/vision/available
 * Obtiene las visiones disponibles para el usuario actual
 * Para Game Changers, busca visiones en VisionGameChanger
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Para Game Changers, buscar visiones en VisionGameChanger
    if (user.rol === 'GAMECHANGER') {
      // Buscar en VisionGameChanger donde el usuario es gameChanger
      const gcAssignments = await prisma.visionGameChanger.findMany({
        where: {
          gameChangerId: user.id,
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              startDate: true,
              endDate: true,
              advancedStartDate: true,
              advancedEndDate: true,
              plWeekend1StartDate: true,
              plWeekend3EndDate: true,
              organizationId: true,
              isActive: true,
            },
          },
        },
      });

      // Fecha actual para filtrar visiones ya finalizadas
      const now = new Date();
      const gracePeriodDays = 7; // Días de gracia después de que termina el entrenamiento
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

      // Agrupar por visión y recopilar los niveles asignados
      const visionMap = new Map<number, {
        id: number;
        nombre: string;
        startDate: Date | null;
        organizationId: number | null;
        assignedLevels: string[];
        isCurrentlyActive: boolean;
      }>();

      gcAssignments
        .filter(a => a.Vision?.isActive)
        .forEach(a => {
          const visionId = a.Vision!.id;
          const level = a.level || 'BASIC';
          const vision = a.Vision!;
          
          // Determinar si este nivel del entrenamiento está activo o próximo
          let levelEndDate: Date | null = null;
          if (level === 'PL' && vision.plWeekend3EndDate) {
            levelEndDate = new Date(vision.plWeekend3EndDate);
          } else if (level === 'ADVANCED' && vision.advancedEndDate) {
            levelEndDate = new Date(vision.advancedEndDate);
          } else if (vision.endDate) {
            levelEndDate = new Date(vision.endDate);
          }
          
          // Solo incluir si el nivel no ha terminado (o está dentro del período de gracia)
          const isLevelActive = !levelEndDate || levelEndDate >= cutoffDate;
          
          if (!visionMap.has(visionId)) {
            visionMap.set(visionId, {
              id: vision.id,
              nombre: vision.nombre,
              startDate: vision.startDate,
              organizationId: vision.organizationId,
              assignedLevels: [],
              isCurrentlyActive: false,
            });
          }
          
          const visionData = visionMap.get(visionId)!;
          
          // Solo añadir niveles que están activos
          if (isLevelActive && !visionData.assignedLevels.includes(level)) {
            visionData.assignedLevels.push(level);
            visionData.isCurrentlyActive = true;
          }
        });

      // Filtrar visiones que tienen al menos un nivel activo y ordenar por fecha
      const visions = Array.from(visionMap.values())
        .filter(v => v.assignedLevels.length > 0)
        .sort((a, b) => {
          // Ordenar por fecha de inicio más reciente primero
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        });

      logger.debug('🔍 vision/available: Filtered visions for GC', {
        userId: user.id,
        totalAssignments: gcAssignments.length,
        visionsWithActiveLevels: visions.length,
        visions: visions.map(v => ({ id: v.id, nombre: v.nombre, levels: v.assignedLevels })),
      });

      if (visions.length === 0) {
        // Fallback: buscar por organizationId (sin niveles específicos)
        const orgVisions = await prisma.vision.findMany({
          where: {
            isActive: true,
            organizationId: user.organizationId || undefined,
            // Solo visiones que no han terminado
            OR: [
              { endDate: null },
              { endDate: { gte: cutoffDate } },
            ],
          },
          select: {
            id: true,
            nombre: true,
            startDate: true,
            organizationId: true,
          },
          orderBy: { startDate: 'desc' },
          take: 10,
        });

        return NextResponse.json({
          success: true,
          visions: orgVisions.map(v => ({
            ...v,
            assignedLevels: ['BASIC', 'ADVANCED', 'PL'], // Todos los niveles por fallback
          })),
        });
      }

      return NextResponse.json({
        success: true,
        visions,
      });
    }

    // Para otros roles, buscar por organización
    const whereClause: any = {
      isActive: true,
    };

    if (user.organizationId) {
      whereClause.organizationId = user.organizationId;
    }

    const visions = await prisma.vision.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        startDate: true,
        organizationId: true,
      },
      orderBy: {
        startDate: 'desc',
      },
      take: 10, // Last 10 visions
    });

    return NextResponse.json({
      success: true,
      visions,
    });
  } catch (error) {
    logger.error('Error fetching available visions:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener visiones' },
      { status: 500 }
    );
  }
}
