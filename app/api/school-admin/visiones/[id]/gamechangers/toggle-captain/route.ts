import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

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
    const { gameChangerId, level, isCaptain } = body;

    if (!gameChangerId || !level) {
      return NextResponse.json({ 
        success: false, 
        error: 'Faltan parámetros: gameChangerId y level' 
      }, { status: 400 });
    }

    // Verificar que el game changer existe
    const visionGC = await prisma.visionGameChanger.findFirst({
      where: {
        visionId,
        gameChangerId: parseInt(gameChangerId),
        level: level,
      },
    });

    if (!visionGC) {
      return NextResponse.json({ 
        success: false, 
        error: 'Game Changer no encontrado en esta visión/nivel' 
      }, { status: 404 });
    }

    // Si se está asignando como capitán, quitar el capitán anterior del mismo nivel
    if (isCaptain) {
      await prisma.visionGameChanger.updateMany({
        where: {
          visionId,
          level: level,
          isCaptain: true,
          id: { not: visionGC.id },
        },
        data: { isCaptain: false },
      });
    }

    // Actualizar el estado de capitán
    const updated = await prisma.visionGameChanger.update({
      where: { id: visionGC.id },
      data: { isCaptain: isCaptain },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: isCaptain 
        ? `${updated.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre} es ahora el Capitán`
        : `Se removió el rol de Capitán`,
      gameChanger: {
        id: updated.gameChangerId,
        isCaptain: updated.isCaptain,
        nombre: updated.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre,
      },
    });
  } catch (error) {
    console.error('Error toggling captain:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar capitán' },
      { status: 500 }
    );
  }
}
