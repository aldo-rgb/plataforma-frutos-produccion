import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/squads/assign-orphan
 * Asigna un huérfano a un grupo (drag & drop desde God Mode)
 */
export async function POST(request: Request) {
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
      select: { id: true, rol: true, nombre: true },
    });

    const COORDINATOR_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

    if (!user || !COORDINATOR_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Solo coordinadores pueden asignar huérfanos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { squadId, userId, enrollmentId } = body;

    if (!squadId || (!userId && !enrollmentId)) {
      return NextResponse.json(
        { success: false, error: 'squadId y (userId o enrollmentId) son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el grupo
    const squad = await prisma.smallGroup.findUnique({
      where: { id: squadId },
      include: {
        _count: { select: { members: { where: { isActive: true } } } },
      },
    });

    if (!squad || !squad.isActive) {
      return NextResponse.json(
        { success: false, error: 'Escuadrón no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Verificar que no esté lleno
    if (squad._count.members >= squad.maxSize) {
      return NextResponse.json(
        { success: false, error: 'Grupo lleno' },
        { status: 400 }
      );
    }

    // Buscar el enrollment
    let enrollment;
    if (enrollmentId) {
      enrollment = await prisma.vision_enrollments.findUnique({
        where: { id: parseInt(enrollmentId) },
        include: {
          Usuario_vision_enrollments_userIdToUsuario: {
            select: { id: true, nombre: true },
          },
        },
      });
    } else {
      enrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: parseInt(userId),
          visionId: squad.visionId,
          level: squad.level,
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
        },
        include: {
          Usuario_vision_enrollments_userIdToUsuario: {
            select: { id: true, nombre: true },
          },
        },
      });
    }

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Participante no encontrado en esta visión/nivel' },
        { status: 404 }
      );
    }

    const targetUserId = enrollment.userId;
    const targetUserName = enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre;

    // Verificar que no esté ya en un grupo
    const existingMembership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: targetUserId,
        isActive: true,
        group: {
          visionId: squad.visionId,
          level: squad.level,
          isActive: true,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { success: false, error: `${targetUserName} ya está en un grupo` },
        { status: 400 }
      );
    }

    // Crear la membresía
    const newMember = await prisma.smallGroupMember.create({
      data: {
        groupId: squadId,
        userId: targetUserId,
        enrollmentId: enrollment.id,
        movedBy: user.id,
        movedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, nombre: true, imagen: true },
        },
      },
    });

    // Obtener conteo actualizado
    const updatedCount = await prisma.smallGroupMember.count({
      where: { groupId: squadId, isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: `${targetUserName} asignado al escuadrón`,
      member: {
        id: newMember.id,
        user: newMember.user,
      },
      squadStats: {
        membersCount: updatedCount,
        maxSize: squad.maxSize,
        isFull: updatedCount >= squad.maxSize,
      },
    });
  } catch (error) {
    console.error('Error assigning orphan:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar participante' },
      { status: 500 }
    );
  }
}
