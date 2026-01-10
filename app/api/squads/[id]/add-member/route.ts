import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'GAMECHANGER', 'TRAINER', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/squads/[id]/add-member
 * Agrega un miembro al escuadrón (por scan QR/NFC o manual)
 * Maneja la lógica de "robo de jugador" si ya está en otro grupo
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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
      select: { id: true, rol: true, organizationId: true, nombre: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const squadId = params.id;
    const body = await request.json();
    const { userId, referralCode, forceMove = false } = body;

    // Buscar el escuadrón
    const squad = await prisma.smallGroup.findUnique({
      where: { id: squadId },
      include: {
        leader: { select: { nombre: true } },
        _count: { select: { members: { where: { isActive: true } } } },
      },
    });

    if (!squad) {
      return NextResponse.json(
        { success: false, error: 'Escuadrón no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario que hace la acción es el líder o admin
    const isLeader = squad.leaderId === user.id;
    const isAdmin = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'].includes(user.rol);
    
    if (!isLeader && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Solo el líder del grupo puede agregar miembros' },
        { status: 403 }
      );
    }

    // Verificar si el grupo está lleno
    if (squad._count.members >= squad.maxSize) {
      return NextResponse.json(
        { success: false, error: 'Grupo lleno. Inicia uno nuevo.', code: 'GROUP_FULL' },
        { status: 400 }
      );
    }

    // Buscar al participante por userId o referralCode
    let targetUser;
    
    if (userId) {
      targetUser = await prisma.usuario.findUnique({
        where: { id: parseInt(userId) },
        select: { id: true, nombre: true, imagen: true, email: true, referralCode: true },
      });
    } else if (referralCode) {
      // Limpiar el código (puede venir con espacios o caracteres extra del QR)
      const cleanCode = referralCode.trim().split(' ')[0].replace(/[^\w]/g, '').toUpperCase();
      
      targetUser = await prisma.usuario.findFirst({
        where: { referralCode: cleanCode },
        select: { id: true, nombre: true, imagen: true, email: true, referralCode: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Participante no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verificar que el participante tiene enrollment en la misma visión
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: targetUser.id,
        visionId: squad.visionId,
        level: squad.level,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { 
          success: false, 
          error: `${targetUser.nombre} no está inscrito en esta visión/nivel`,
          code: 'NOT_ENROLLED' 
        },
        { status: 400 }
      );
    }

    // Verificar si ya está en ESTE grupo
    const existingInThisGroup = await prisma.smallGroupMember.findFirst({
      where: {
        groupId: squadId,
        userId: targetUser.id,
        isActive: true,
      },
    });

    if (existingInThisGroup) {
      return NextResponse.json({
        success: true,
        message: `${targetUser.nombre} ya está en tu escuadrón`,
        member: {
          id: existingInThisGroup.id,
          user: targetUser,
          isExisting: true,
        },
      });
    }

    // Verificar si está en OTRO grupo de la misma visión/nivel
    const existingInOtherGroup = await prisma.smallGroupMember.findFirst({
      where: {
        userId: targetUser.id,
        isActive: true,
        group: {
          visionId: squad.visionId,
          level: squad.level,
          isActive: true,
          id: { not: squadId },
        },
      },
      include: {
        group: {
          include: {
            leader: { select: { nombre: true } },
          },
        },
      },
    });

    // Si está en otro grupo, preguntar o mover
    if (existingInOtherGroup && !forceMove) {
      return NextResponse.json({
        success: false,
        error: `${targetUser.nombre} ya está en el grupo de ${existingInOtherGroup.group.leader.nombre}. ¿Moverlo a tu grupo?`,
        code: 'ALREADY_IN_GROUP',
        conflictData: {
          currentGroup: {
            id: existingInOtherGroup.group.id,
            name: existingInOtherGroup.group.name,
            leaderName: existingInOtherGroup.group.leader.nombre,
          },
          user: targetUser,
        },
      });
    }

    // Si forceMove o no está en otro grupo, proceder
    const result = await prisma.$transaction(async (tx) => {
      // Si estaba en otro grupo, desactivar esa membresía
      if (existingInOtherGroup) {
        await tx.smallGroupMember.update({
          where: { id: existingInOtherGroup.id },
          data: {
            isActive: false,
            removedAt: new Date(),
            removedReason: `Movido al grupo de ${user.nombre}`,
          },
        });
      }

      // Crear la nueva membresía
      const newMember = await tx.smallGroupMember.create({
        data: {
          groupId: squadId,
          userId: targetUser!.id,
          enrollmentId: enrollment.id,
          previousGroupId: existingInOtherGroup?.groupId || null,
          movedAt: existingInOtherGroup ? new Date() : null,
          movedBy: existingInOtherGroup ? user.id : null,
        },
        include: {
          user: {
            select: { id: true, nombre: true, imagen: true, email: true },
          },
        },
      });

      return newMember;
    });

    // Obtener el conteo actualizado
    const updatedCount = await prisma.smallGroupMember.count({
      where: { groupId: squadId, isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: existingInOtherGroup 
        ? `${targetUser.nombre} movido a tu escuadrón` 
        : `${targetUser.nombre} agregado al escuadrón`,
      member: {
        id: result.id,
        user: result.user,
        wasMoved: !!existingInOtherGroup,
      },
      squadStats: {
        membersCount: updatedCount,
        maxSize: squad.maxSize,
        isFull: updatedCount >= squad.maxSize,
      },
    });
  } catch (error) {
    console.error('Error adding member to squad:', error);
    return NextResponse.json(
      { success: false, error: 'Error al agregar miembro' },
      { status: 500 }
    );
  }
}
