import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'GAMECHANGER', 'TRAINER', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/squads/[id]/add-member
 * Agrega un miembro al Átomo (por scan QR/NFC o manual)
 * Maneja la lógica de "robo de jugador" si ya está en otro grupo
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params en Next.js 14+
    const { id: squadId } = await context.params;
    
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

    const body = await request.json();
    const { userId, referralCode, forceMove = false } = body;

    // Buscar el escuadrón
    const squad = await prisma.smallGroup.findUnique({
      where: { id: squadId },
      include: {
        Usuario: { select: { nombre: true } },
        Vision: { select: { advancedStartDate: true, endDate: true } },
        SchoolProduct: { select: { trainingStatus: true } },
        _count: { select: { SmallGroupMember: { where: { isActive: true } } } },
      },
    });

    if (!squad) {
      return NextResponse.json(
        { success: false, error: 'Átomo no encontrado' },
        { status: 404 }
      );
    }

    // VALIDACIÓN DE SEGURIDAD: No permitir modificar átomos de niveles finalizados
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Verificar si el nivel ya finalizó
    let isLevelFinalized = false;
    if (squad.level === 'BASIC') {
      // BASIC finaliza cuando inicia ADVANCED o cuando el producto está COMPLETED
      if (squad.Vision?.advancedStartDate) {
        const advStartDate = new Date(squad.Vision.advancedStartDate);
        advStartDate.setHours(0, 0, 0, 0);
        if (now >= advStartDate) {
          isLevelFinalized = true;
        }
      }
      if (squad.SchoolProduct?.trainingStatus === 'COMPLETED') {
        isLevelFinalized = true;
      }
    } else if (squad.level === 'ADVANCED') {
      if (squad.SchoolProduct?.trainingStatus === 'COMPLETED') {
        isLevelFinalized = true;
      }
    }
    
    if (isLevelFinalized) {
      return NextResponse.json(
        { success: false, error: 'No se pueden agregar miembros a un átomo de un nivel que ya finalizó', code: 'LEVEL_FINALIZED' },
        { status: 403 }
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
    if (squad._count.SmallGroupMember >= squad.maxSize) {
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
    // Buscar enrollment con cualquier level válido para esta visión
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: targetUser.id,
        visionId: squad.visionId,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] },
      },
    });

    logger.debug('📋 Enrollment check:', { 
      userId: targetUser.id, 
      visionId: squad.visionId, 
      squadLevel: squad.level,
      enrollmentFound: !!enrollment,
      enrollmentLevel: enrollment?.level 
    });

    // Permitir agregar aunque no tenga enrollment exacto (el GC puede agregar participantes pendientes)
    // Solo advertir si no hay ningún enrollment
    if (!enrollment) {
      logger.debug('⚠️ No enrollment found, but allowing add');
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
        message: `${targetUser.nombre} ya está en tu Átomo`,
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
        SmallGroup: {
          visionId: squad.visionId,
          level: squad.level,
          isActive: true,
          id: { not: squadId },
        },
      },
      include: {
        SmallGroup: {
          include: {
            Usuario: { select: { nombre: true } },
          },
        },
      },
    });

    // Si está en otro grupo, preguntar o mover
    if (existingInOtherGroup && !forceMove) {
      return NextResponse.json({
        success: false,
        error: `${targetUser.nombre} ya está en el Átomo de ${existingInOtherGroup.SmallGroup.Usuario.nombre}. ¿Moverlo a tu Átomo?`,
        code: 'ALREADY_IN_GROUP',
        conflictData: {
          currentGroup: {
            id: existingInOtherGroup.SmallGroup.id,
            name: existingInOtherGroup.SmallGroup.name,
            leaderName: existingInOtherGroup.SmallGroup.Usuario.nombre,
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
          id: crypto.randomUUID(),
          groupId: squadId,
          userId: targetUser!.id,
          enrollmentId: enrollment?.id || null,
          previousGroupId: existingInOtherGroup?.SmallGroup?.id || null,
          movedAt: existingInOtherGroup ? new Date() : null,
          movedBy: existingInOtherGroup ? user.id : null,
        },
        include: {
          Usuario_SmallGroupMember_userIdToUsuario: {
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
        ? `${targetUser.nombre} movido a tu Átomo` 
        : `${targetUser.nombre} agregado al Átomo`,
      member: {
        id: result.id,
        user: result.Usuario_SmallGroupMember_userIdToUsuario,
        wasMoved: !!existingInOtherGroup,
      },
      squadStats: {
        membersCount: updatedCount,
        maxSize: squad.maxSize,
        isFull: updatedCount >= squad.maxSize,
      },
    });
  } catch (error: any) {
    logger.error('Error adding member to squad:', error);
    logger.error('Error details:', error?.message, error?.code);
    
    let errorMessage = 'Error al agregar miembro';
    if (error?.code === 'P2002') {
      errorMessage = 'Este participante ya está en el grupo';
    } else if (error?.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
