import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

// GET - Verificar si el Game Changer tiene participantes asignados en ese nivel
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gameChangerId = searchParams.get('gameChangerId');
    const level = searchParams.get('level');

    if (!gameChangerId || !level) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros' }, { status: 400 });
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const gcId = parseInt(gameChangerId);

    // Buscar el SmallGroup de este Game Changer en esta visión y nivel
    const smallGroup = await prisma.smallGroup.findFirst({
      where: {
        visionId,
        leaderId: gcId,
        level: level as any,
        isActive: true,
      },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, nombre: true, email: true }
            }
          }
        }
      }
    });

    if (!smallGroup || smallGroup.members.length === 0) {
      return NextResponse.json({
        success: true,
        hasMembers: false,
        members: [],
        message: 'El Game Changer no tiene participantes asignados en este nivel'
      });
    }

    // También obtener otros Game Changers disponibles para reasignación
    const otherGameChangers = await prisma.visionGameChanger.findMany({
      where: {
        visionId,
        level: level as any,
        gameChangerId: { not: gcId },
      },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      hasMembers: true,
      groupId: smallGroup.id,
      members: smallGroup.members.map(m => ({
        id: m.id,
        userId: m.userId,
        nombre: m.user.nombre,
        email: m.user.email,
      })),
      availableGameChangers: otherGameChangers.map(gc => ({
        id: gc.gameChangerId,
        nombre: gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre,
        email: gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.email,
      })),
      message: `El Game Changer tiene ${smallGroup.members.length} participante(s) asignado(s)`
    });
  } catch (error) {
    console.error('Error checking game changer members:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al verificar participantes' 
    }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { gameChangerId, reassignments } = body;

    console.log('Unassign game changer request:', { visionId, gameChangerId, reassignments });

    if (!gameChangerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Falta el parámetro gameChangerId' 
      }, { status: 400 });
    }

    const gcId = typeof gameChangerId === 'string' ? parseInt(gameChangerId) : gameChangerId;

    // Buscar el registro VisionGameChanger por su ID directo
    const visionGC = await prisma.visionGameChanger.findFirst({
      where: {
        id: gcId,
        visionId,
      },
    });

    console.log('Found VisionGameChanger:', visionGC);

    if (!visionGC) {
      return NextResponse.json({ 
        success: false, 
        error: 'Game Changer no encontrado en esta visión' 
      }, { status: 404 });
    }

    // Si hay reasignaciones, procesarlas primero
    if (reassignments && Array.isArray(reassignments) && reassignments.length > 0) {
      for (const reassignment of reassignments) {
        const { memberId, newGameChangerId } = reassignment;
        
        // Encontrar el nuevo SmallGroup del Game Changer destino
        let targetGroup = await prisma.smallGroup.findFirst({
          where: {
            visionId,
            leaderId: newGameChangerId,
            level: visionGC.level,
            isActive: true,
          }
        });

        // Si no existe el grupo del GC destino, crearlo
        if (!targetGroup) {
          const gcUser = await prisma.usuario.findUnique({
            where: { id: newGameChangerId },
            select: { organizationId: true }
          });
          
          targetGroup = await prisma.smallGroup.create({
            data: {
              visionId,
              leaderId: newGameChangerId,
              level: visionGC.level,
              organizationId: gcUser?.organizationId || user.organizationId!,
              isActive: true,
            }
          });
        }

        // Mover el miembro al nuevo grupo
        await prisma.smallGroupMember.update({
          where: { id: memberId },
          data: {
            groupId: targetGroup.id,
            previousGroupId: memberId, // guardamos referencia
            movedAt: new Date(),
            movedBy: user.id,
          }
        });
      }
    }

    // Desactivar el SmallGroup del Game Changer si existe
    await prisma.smallGroup.updateMany({
      where: {
        visionId,
        leaderId: visionGC.gameChangerId,
        level: visionGC.level,
      },
      data: {
        isActive: false,
        closedAt: new Date(),
      }
    });

    // Eliminar el registro de VisionGameChanger (desasignar)
    await prisma.visionGameChanger.delete({
      where: {
        id: gcId,
      },
    });

    console.log('Game Changer unassigned successfully:', gcId);

    return NextResponse.json({
      success: true,
      message: 'Game Changer desasignado exitosamente',
    });
  } catch (error) {
    console.error('Error unassigning game changer:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al desasignar el Game Changer' 
    }, { status: 500 });
  }
}
