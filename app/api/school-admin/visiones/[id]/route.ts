import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
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

    // Obtener la visión con participantes y coordinador
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Coordinador: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        _count: {
          select: {
            Participantes: true,
            GameChangers: true,
          },
        },
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la visión pertenece a la organización del director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId || vision.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Obtener participantes de la visión
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Participante: {
          select: {
            id: true,
            nombre: true,
            email: true,
            tier: true,
            licenseCode: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Obtener game changers de la visión
    const gameChangers = await prisma.visionGameChanger.findMany({
      where: { visionId },
      include: {
        GameChanger: {
          select: {
            id: true,
            nombre: true,
            email: true,
            tier: true,
            licenseCode: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      vision,
      participantes,
      gameChangers,
    });
  } catch (error) {
    console.error('Error fetching vision details:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener detalles de la visión' },
      { status: 500 }
    );
  }
}
