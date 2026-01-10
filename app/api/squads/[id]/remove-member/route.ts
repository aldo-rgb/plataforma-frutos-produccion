import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/squads/[id]/remove-member
 * Remueve un miembro del escuadrón
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
      select: { id: true, rol: true, nombre: true },
    });

    const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'GAME_CHANGER', 'STAFF', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const squadId = params.id;
    const body = await request.json();
    const { memberId, userId, reason } = body;

    // Buscar el escuadrón
    const squad = await prisma.smallGroup.findUnique({
      where: { id: squadId },
    });

    if (!squad) {
      return NextResponse.json(
        { success: false, error: 'Escuadrón no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isLeader = squad.leaderId === user.id;
    const isAdmin = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'].includes(user.rol);
    
    if (!isLeader && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para remover miembros' },
        { status: 403 }
      );
    }

    // Buscar el miembro
    let member;
    if (memberId) {
      member = await prisma.smallGroupMember.findUnique({
        where: { id: memberId },
        include: { user: { select: { nombre: true } } },
      });
    } else if (userId) {
      member = await prisma.smallGroupMember.findFirst({
        where: { groupId: squadId, userId: parseInt(userId), isActive: true },
        include: { user: { select: { nombre: true } } },
      });
    }

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Miembro no encontrado' },
        { status: 404 }
      );
    }

    // Remover el miembro (soft delete)
    await prisma.smallGroupMember.update({
      where: { id: member.id },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedReason: reason || `Removido por ${user.nombre}`,
      },
    });

    // Obtener el conteo actualizado
    const updatedCount = await prisma.smallGroupMember.count({
      where: { groupId: squadId, isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: `${member.user.nombre} removido del escuadrón`,
      squadStats: {
        membersCount: updatedCount,
        maxSize: squad.maxSize,
      },
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { success: false, error: 'Error al remover miembro' },
      { status: 500 }
    );
  }
}
