import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/squads/vision/[visionId]/stats
 * Estadísticas de grupos para el coordinador (God Mode)
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

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    const COORDINATOR_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

    if (!user || !COORDINATOR_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Solo coordinadores pueden ver estas estadísticas' },
        { status: 403 }
      );
    }

    const visionId = parseInt(params.visionId);
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'BASIC';
    const productId = searchParams.get('productId');

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { id: true, nombre: true, organizationId: true },
    });

    if (!vision || vision.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Total de participantes en esta visión/nivel
    const totalParticipants = await prisma.vision_enrollments.count({
      where: {
        visionId,
        level: level as any,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
      },
    });

    // Participantes asignados a algún grupo
    const assignedParticipants = await prisma.smallGroupMember.count({
      where: {
        isActive: true,
        SmallGroup: {
          visionId,
          level: level as any,
          isActive: true,
          ...(productId && { productId: parseInt(productId) }),
        },
      },
    });

    // Huérfanos (sin grupo)
    const orphanCount = totalParticipants - assignedParticipants;

    // Obtener los huérfanos
    const assignedUserIds = await prisma.smallGroupMember.findMany({
      where: {
        isActive: true,
        SmallGroup: {
          visionId,
          level: level as any,
          isActive: true,
        },
      },
      select: { userId: true },
    });

    const assignedIds = assignedUserIds.map((m) => m.userId);

    const orphans = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        level: level as any,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
        userId: { notIn: assignedIds.length > 0 ? assignedIds : [-1] },
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, nombre: true, imagen: true, email: true, referralCode: true },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    });

    // Todos los grupos
    const squads = await prisma.smallGroup.findMany({
      where: {
        visionId,
        level: level as any,
        isActive: true,
        ...(productId && { productId: parseInt(productId) }),
      },
      include: {
        Usuario: {
          select: { id: true, nombre: true, imagen: true, email: true },
        },
        SmallGroupMember: {
          where: { isActive: true },
          include: {
            Usuario_SmallGroupMember_userIdToUsuario: {
              select: { id: true, nombre: true, imagen: true, email: true, referralCode: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { SmallGroupMember: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Game Changers disponibles (asignados a esta visión)
    const gameChangers = await prisma.visionGameChanger.findMany({
      where: {
        visionId,
        level: level as any,
      },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: { id: true, nombre: true, imagen: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalParticipants,
        assignedParticipants,
        orphanCount,
        squadsCount: squads.length,
        averageSquadSize: squads.length > 0 
          ? Math.round(assignedParticipants / squads.length * 10) / 10 
          : 0,
      },
      vision: {
        id: vision.id,
        nombre: vision.nombre,
      },
      level,
      squads: squads.map((s) => ({
        id: s.id,
        name: s.name,
        maxSize: s.maxSize,
        leader: s.Usuario,
        membersCount: s._count.SmallGroupMember,
        isFull: s._count.SmallGroupMember >= s.maxSize,
        members: s.SmallGroupMember.map((m) => ({
          id: m.id,
          user: m.Usuario_SmallGroupMember_userIdToUsuario,
          joinedAt: m.joinedAt,
        })),
      })),
      orphans: orphans.map((o) => ({
        enrollmentId: o.id,
        user: o.Usuario_vision_enrollments_userIdToUsuario,
        enrolledAt: o.enrolledAt,
      })),
      gameChangers: gameChangers.map((gc) => ({
        id: gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id,
        nombre: gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre,
        imagen: gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.imagen,
        hasSquad: squads.some((s) => s.leaderId === gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id),
      })),
    });
  } catch (error) {
    logger.error('Error fetching vision squad stats:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
