import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VisionLevel } from '@prisma/client';

const VALID_LEVELS: VisionLevel[] = ['BASIC', 'ADVANCED', 'PL'];

/**
 * GET /api/squads/vision/[visionId]/orphans
 * Lista participantes sin grupo asignado (huérfanos)
 * Query params: level (opcional, filtra por nivel: BASIC, ADVANCED, PL)
 */
export async function GET(
  request: Request,
  { params }: { params: { visionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const visionId = parseInt(params.visionId);
    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const levelParam = searchParams.get('level')?.toUpperCase() as VisionLevel | null;
    const level = levelParam && VALID_LEVELS.includes(levelParam) ? levelParam : null;

    // Obtener todos los enrollments activos de la visión
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        ...(level ? { level } : {}),
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
      },
      select: {
        id: true,
        userId: true,
        level: true,
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            telefono: true,
          },
        },
      },
    });

    // Obtener IDs de usuarios que YA están en un grupo activo para esta visión/nivel
    const assignedUserIds = await prisma.smallGroupMember.findMany({
      where: {
        isActive: true,
        group: {
          visionId,
          ...(level ? { level } : {}),
          isActive: true,
        },
      },
      select: {
        userId: true,
      },
    });

    const assignedSet = new Set(assignedUserIds.map(m => m.userId));

    // Filtrar huérfanos (participantes sin grupo)
    const orphans = enrollments
      .filter(e => !assignedSet.has(e.userId))
      .map(e => ({
        enrollmentId: e.id,
        userId: e.userId,
        level: e.level,
        user: e.Usuario_vision_enrollments_userIdToUsuario,
      }));

    // Agrupar por nivel si no se especificó uno
    const orphansByLevel: Record<string, typeof orphans> = {};
    
    orphans.forEach(o => {
      if (!orphansByLevel[o.level]) {
        orphansByLevel[o.level] = [];
      }
      orphansByLevel[o.level].push(o);
    });

    return NextResponse.json({
      success: true,
      visionId,
      level: level ?? 'all',
      totalOrphans: orphans.length,
      orphans: level ? orphans : undefined,
      orphansByLevel: !level ? orphansByLevel : undefined,
    });
  } catch (error) {
    console.error('Error fetching orphans:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener huérfanos' },
      { status: 500 }
    );
  }
}
