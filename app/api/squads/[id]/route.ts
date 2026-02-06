import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'GAMECHANGER', 'STAFF', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * GET /api/squads/[id]
 * Obtiene detalle de un escuadrón
 */
export async function GET(
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
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const squad = await prisma.smallGroup.findUnique({
      where: { id: params.id },
      include: {
        leader: {
          select: { id: true, nombre: true, imagen: true, email: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
        product: {
          select: { id: true, name: true },
        },
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, nombre: true, imagen: true, email: true, telefono: true },
            },
            enrollment: {
              select: { id: true, enrollmentStatus: true, attendanceStatus: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { members: { where: { isActive: true } } },
        },
      },
    });

    if (!squad) {
      return NextResponse.json(
        { success: false, error: 'Escuadrón no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isLeader = squad.leaderId === user.id;
    const isAdminOrCoord = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'].includes(user.rol);
    
    if (!isLeader && !isAdminOrCoord) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para ver este escuadrón' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      squad: {
        id: squad.id,
        name: squad.name,
        level: squad.level,
        maxSize: squad.maxSize,
        isActive: squad.isActive,
        leader: squad.leader,
        vision: squad.vision,
        product: squad.product,
        membersCount: squad._count.members,
        isFull: squad._count.members >= squad.maxSize,
        members: squad.members.map((m) => ({
          id: m.id,
          user: m.user,
          enrollment: m.enrollment,
          joinedAt: m.joinedAt,
        })),
        createdAt: squad.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching squad:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener escuadrón' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/squads/[id]
 * Actualiza un escuadrón (nombre, estado)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    // Permitir a cualquier usuario autenticado si es el líder del squad
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const squad = await prisma.smallGroup.findUnique({
      where: { id },
    });

    if (!squad) {
      return NextResponse.json(
        { success: false, error: 'Escuadrón no encontrado' },
        { status: 404 }
      );
    }

    // Solo el líder o admins pueden editar
    const isLeader = squad.leaderId === user.id;
    const isAdmin = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'ADMINISTRADOR', 'SUPER_ADMIN'].includes(user.rol);
    
    logger.debug('🔧 PATCH Squad - Permisos:', {
      squadId: id,
      squadLeaderId: squad.leaderId,
      userId: user.id,
      userRol: user.rol,
      isLeader,
      isAdmin,
    });
    
    // El líder (Game Changer) siempre puede editar su propio squad
    if (!isLeader && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar este escuadrón' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, maxSize, isActive } = body;

    const updatedSquad = await prisma.smallGroup.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(maxSize && { maxSize }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(isActive === false && { closedAt: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Escuadrón actualizado',
      squad: updatedSquad,
    });
  } catch (error) {
    logger.error('Error updating squad:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar escuadrón' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/squads/[id]
 * Elimina/desactiva un escuadrón
 */
export async function DELETE(
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
      select: { id: true, rol: true },
    });

    // Solo admins/coordinadores pueden eliminar
    if (!user || !['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para eliminar escuadrones' },
        { status: 403 }
      );
    }

    // Desactivar el grupo (soft delete)
    const squad = await prisma.smallGroup.update({
      where: { id: params.id },
      data: {
        isActive: false,
        closedAt: new Date(),
      },
    });

    // Desactivar todos los miembros
    await prisma.smallGroupMember.updateMany({
      where: { groupId: params.id },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedReason: 'Grupo eliminado',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Escuadrón eliminado',
    });
  } catch (error) {
    logger.error('Error deleting squad:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar escuadrón' },
      { status: 500 }
    );
  }
}
