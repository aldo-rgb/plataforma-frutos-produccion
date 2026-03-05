import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Roles permitidos para acceder a esta API
const ALLOWED_ROLES = [
  'SCHOOL_ADMIN', 
  'ADMINISTRADOR', 
  'COORDINADOR', 
  'COORDINATOR_BASIC', 
  'COORDINATOR_ADVANCED'
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Roles que NO pueden ser Game Changers
    const ROLES_NO_PERMITIDOS_GC = ['TRAINER', 'SCHOOL_ADMIN', 'ADMINISTRADOR'];

    const gameChangers = await prisma.visionGameChanger.findMany({
      where: {
        visionId: visionId,
        // Excluir trainers y admins de la lista de GCs
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          AND: [
            { rol: { notIn: ROLES_NO_PERMITIDOS_GC } },
            { esEntrenador: { not: true } }
          ]
        }
      },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            profileImage: true,
            rol: true,
            esEntrenador: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      gameChangers: gameChangers.map(gc => ({
        id: gc.id,
        usuario: gc.Usuario_VisionGameChanger_gameChangerIdToUsuario,
        assignedAt: gc.createdAt,
        level: gc.level,
        isCaptain: gc.isCaptain,
      })),
    });

  } catch (error) {
    logger.error('❌ Error fetching game changers:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener game changers' },
      { status: 500 }
    );
  }
}
