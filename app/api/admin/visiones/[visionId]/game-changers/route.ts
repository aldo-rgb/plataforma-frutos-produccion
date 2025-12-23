import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Asignar Game Changer a una visión
export async function POST(
  request: NextRequest,
  { params }: { params: { visionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (usuario?.rol !== 'COORDINADOR' && usuario?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Solo coordinadores pueden asignar Game Changers' }, { status: 403 });
    }

    const visionId = parseInt(params.visionId);
    const body = await request.json();
    const { gameChangerId } = body;

    if (!gameChangerId) {
      return NextResponse.json({ error: 'gameChangerId es requerido' }, { status: 400 });
    }

    // Verificar que la visión existe y pertenece al coordinador
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        coordinadorId: usuario.id
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada o no autorizada' }, { status: 404 });
    }

    // Verificar que el usuario es Game Changer
    const gameChanger = await prisma.usuario.findFirst({
      where: {
        id: gameChangerId,
        rol: 'GAMECHANGER'
      }
    });

    if (!gameChanger) {
      return NextResponse.json({ error: 'Usuario no es Game Changer' }, { status: 400 });
    }

    // Verificar que no esté ya asignado
    const existente = await prisma.visionGameChanger.findUnique({
      where: {
        visionId_gameChangerId: {
          visionId,
          gameChangerId
        }
      }
    });

    if (existente) {
      return NextResponse.json({ error: 'Game Changer ya asignado a esta visión' }, { status: 400 });
    }

    // Crear asignación
    const asignacion = await prisma.visionGameChanger.create({
      data: {
        visionId,
        gameChangerId,
        asignadoPorId: usuario.id
      },
      include: {
        GameChanger: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Game Changer asignado exitosamente',
      asignacion 
    });

  } catch (error) {
    console.error('Error asignando Game Changer:', error);
    return NextResponse.json({ error: 'Error al asignar Game Changer' }, { status: 500 });
  }
}

// GET - Listar Game Changers de una visión
export async function GET(
  request: NextRequest,
  { params }: { params: { visionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (usuario?.rol !== 'COORDINADOR' && usuario?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const visionId = parseInt(params.visionId);

    // Verificar acceso a la visión
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        coordinadorId: usuario.id
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    const gameChangers = await prisma.visionGameChanger.findMany({
      where: { visionId },
      include: {
        GameChanger: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true
          }
        },
        AsignadoPor: {
          select: {
            nombre: true
          }
        },
        _count: {
          select: {
            Participantes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ gameChangers });

  } catch (error) {
    console.error('Error loading game changers:', error);
    return NextResponse.json({ error: 'Error al cargar Game Changers' }, { status: 500 });
  }
}

// DELETE - Remover Game Changer de una visión
export async function DELETE(
  request: NextRequest,
  { params }: { params: { visionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (usuario?.rol !== 'COORDINADOR' && usuario?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const visionId = parseInt(params.visionId);
    const { searchParams } = new URL(request.url);
    const gameChangerId = parseInt(searchParams.get('gameChangerId') || '0');

    if (!gameChangerId) {
      return NextResponse.json({ error: 'gameChangerId es requerido' }, { status: 400 });
    }

    // Verificar acceso
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        coordinadorId: usuario.id
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar si tiene participantes asignados
    const participantes = await prisma.visionParticipante.count({
      where: {
        visionId,
        gameChangerId
      }
    });

    if (participantes > 0) {
      return NextResponse.json({ 
        error: `No se puede remover. Tiene ${participantes} participantes asignados. Reasígnalos primero.` 
      }, { status: 400 });
    }

    // Eliminar asignación
    await prisma.visionGameChanger.delete({
      where: {
        visionId_gameChangerId: {
          visionId,
          gameChangerId
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Game Changer removido de la visión' 
    });

  } catch (error) {
    console.error('Error removing game changer:', error);
    return NextResponse.json({ error: 'Error al remover Game Changer' }, { status: 500 });
  }
}
