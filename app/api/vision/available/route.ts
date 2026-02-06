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
              organizationId: true,
              isActive: true,
            },
          },
        },
      });

      // Agrupar por visión y recopilar los niveles asignados
      const visionMap = new Map<number, {
        id: number;
        nombre: string;
        startDate: Date | null;
        organizationId: number | null;
        assignedLevels: string[];
      }>();

      gcAssignments
        .filter(a => a.Vision?.isActive)
        .forEach(a => {
          const visionId = a.Vision!.id;
          if (!visionMap.has(visionId)) {
            visionMap.set(visionId, {
              id: a.Vision!.id,
              nombre: a.Vision!.nombre,
              startDate: a.Vision!.startDate,
              organizationId: a.Vision!.organizationId,
              assignedLevels: [],
            });
          }
          // Añadir el nivel asignado
          const level = a.level || 'BASIC';
          const visionData = visionMap.get(visionId)!;
          if (!visionData.assignedLevels.includes(level)) {
            visionData.assignedLevels.push(level);
          }
        });

      const visions = Array.from(visionMap.values());

      if (visions.length === 0) {
        // Fallback: buscar por organizationId (sin niveles específicos)
        const orgVisions = await prisma.vision.findMany({
          where: {
            isActive: true,
            organizationId: user.organizationId || undefined,
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
