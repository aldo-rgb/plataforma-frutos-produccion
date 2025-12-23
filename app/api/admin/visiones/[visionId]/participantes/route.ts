import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Asignar Participante a un Game Changer en una visión
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
      return NextResponse.json({ error: 'Solo coordinadores pueden asignar participantes' }, { status: 403 });
    }

    const visionId = parseInt(params.visionId);
    const body = await request.json();
    const { participanteId, gameChangerId } = body;

    if (!participanteId || !gameChangerId) {
      return NextResponse.json({ error: 'participanteId y gameChangerId son requeridos' }, { status: 400 });
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

    // Verificar que el participante existe
    const participante = await prisma.usuario.findFirst({
      where: {
        id: participanteId,
        rol: 'PARTICIPANTE'
      }
    });

    if (!participante) {
      return NextResponse.json({ error: 'Usuario no es Participante' }, { status: 400 });
    }

    // Verificar que el Game Changer está asignado a esta visión
    const gcEnVision = await prisma.visionGameChanger.findUnique({
      where: {
        visionId_gameChangerId: {
          visionId,
          gameChangerId
        }
      }
    });

    if (!gcEnVision) {
      return NextResponse.json({ error: 'Game Changer no está asignado a esta visión' }, { status: 400 });
    }

    // Verificar que el participante no esté ya asignado
    const existente = await prisma.visionParticipante.findUnique({
      where: {
        visionId_participanteId: {
          visionId,
          participanteId
        }
      }
    });

    if (existente) {
      return NextResponse.json({ error: 'Participante ya asignado a esta visión' }, { status: 400 });
    }

    // Crear asignación
    const asignacion = await prisma.visionParticipante.create({
      data: {
        visionId,
        participanteId,
        gameChangerId,
        asignadoPorId: usuario.id
      },
      include: {
        Participante: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        GameChanger: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // Actualizar campo gameChangerId en Usuario para compatibilidad
    await prisma.usuario.update({
      where: { id: participanteId },
      data: { gameChangerId }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Participante asignado exitosamente',
      asignacion 
    });

  } catch (error) {
    console.error('Error asignando participante:', error);
    return NextResponse.json({ error: 'Error al asignar participante' }, { status: 500 });
  }
}

// GET - Listar Participantes de una visión
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

    const visionId = parseInt(params.visionId);

    // Coordinador ve todos los participantes
    if (usuario?.rol === 'COORDINADOR' || usuario?.rol === 'ADMINISTRADOR') {
      const vision = await prisma.vision.findFirst({
        where: {
          id: visionId,
          coordinadorId: usuario.id
        }
      });

      if (!vision) {
        return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
      }

      const participantes = await prisma.visionParticipante.findMany({
        where: { visionId },
        include: {
          Participante: {
            select: {
              id: true,
              nombre: true,
              email: true,
              profileImage: true,
              completionStreak: true,
              nivelActual: true
            }
          },
          GameChanger: {
            select: {
              id: true,
              nombre: true
            }
          },
          AsignadoPor: {
            select: {
              nombre: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json({ participantes });
    }

    // Game Changer solo ve sus participantes
    if (usuario?.rol === 'GAMECHANGER') {
      const participantes = await prisma.visionParticipante.findMany({
        where: {
          visionId,
          gameChangerId: usuario.id
        },
        include: {
          Participante: {
            select: {
              id: true,
              nombre: true,
              email: true,
              profileImage: true,
              completionStreak: true,
              nivelActual: true,
              lastCompletionDate: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json({ participantes });
    }

    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  } catch (error) {
    console.error('Error loading participantes:', error);
    return NextResponse.json({ error: 'Error al cargar participantes' }, { status: 500 });
  }
}

// PATCH - Reasignar participante a otro Game Changer
export async function PATCH(
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
      return NextResponse.json({ error: 'Solo coordinadores pueden reasignar' }, { status: 403 });
    }

    const visionId = parseInt(params.visionId);
    const body = await request.json();
    const { participanteId, nuevoGameChangerId } = body;

    if (!participanteId || !nuevoGameChangerId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
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

    // Verificar que el nuevo GC está en la visión
    const gcEnVision = await prisma.visionGameChanger.findUnique({
      where: {
        visionId_gameChangerId: {
          visionId,
          gameChangerId: nuevoGameChangerId
        }
      }
    });

    if (!gcEnVision) {
      return NextResponse.json({ error: 'Game Changer no está en esta visión' }, { status: 400 });
    }

    // Actualizar asignación
    const actualizado = await prisma.visionParticipante.update({
      where: {
        visionId_participanteId: {
          visionId,
          participanteId
        }
      },
      data: {
        gameChangerId: nuevoGameChangerId,
        asignadoPorId: usuario.id
      },
      include: {
        Participante: {
          select: {
            nombre: true
          }
        },
        GameChanger: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Actualizar campo en Usuario
    await prisma.usuario.update({
      where: { id: participanteId },
      data: { gameChangerId: nuevoGameChangerId }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Participante reasignado exitosamente',
      asignacion: actualizado 
    });

  } catch (error) {
    console.error('Error reasignando participante:', error);
    return NextResponse.json({ error: 'Error al reasignar participante' }, { status: 500 });
  }
}

// DELETE - Remover participante de una visión
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
    const participanteId = parseInt(searchParams.get('participanteId') || '0');

    if (!participanteId) {
      return NextResponse.json({ error: 'participanteId es requerido' }, { status: 400 });
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

    // Eliminar asignación
    await prisma.visionParticipante.delete({
      where: {
        visionId_participanteId: {
          visionId,
          participanteId
        }
      }
    });

    // Limpiar campo en Usuario
    await prisma.usuario.update({
      where: { id: participanteId },
      data: { gameChangerId: null }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Participante removido de la visión' 
    });

  } catch (error) {
    console.error('Error removing participante:', error);
    return NextResponse.json({ error: 'Error al remover participante' }, { status: 500 });
  }
}
