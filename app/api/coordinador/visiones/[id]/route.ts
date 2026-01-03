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

    if (!session?.user || session.user.rol !== 'COORDINADOR') {
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
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        _count: {
          select: {
            VisionParticipante: true,
            VisionGameChanger: true,
            VisionMentor: true,
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

    // Verificar que el coordinador tiene acceso a esta visión
    if (vision.coordinadorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Obtener participantes de la visión
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            CartaFrutos: {
              select: {
                id: true,
                estado: true,
              },
            },
            LicenseAssignments: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
        Usuario_VisionParticipante_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
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
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            LicenseAssignments: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      vision: {
        ...vision,
        startDate: vision.startDate ? vision.startDate.toISOString() : null,
        endDate: vision.endDate ? vision.endDate.toISOString() : null,
      },
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'COORDINADOR') {
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

    const body = await request.json();
    const {
      forceFinanzasArea,
      forceRelacionesArea,
      forceTalentosArea,
      forceSaludArea,
      forcePazMentalArea,
      forceOcioArea,
      forceTransformationArea,
      transformationGuestsTarget,
      forceCommunityServiceArea,
    } = body;

    // Validaciones
    if (typeof forceFinanzasArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forceFinanzasArea debe ser booleano' },
        { status: 400 }
      );
    }

    if (typeof forceRelacionesArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forceRelacionesArea debe ser booleano' },
        { status: 400 }
      );
    }

    if (typeof forceTalentosArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forceTalentosArea debe ser booleano' },
        { status: 400 }
      );
    }

    if (typeof forceSaludArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forceSaludArea debe ser booleano' },
        { status: 400 }
      );
    }

    if (typeof forcePazMentalArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forcePazMentalArea debe ser booleano' },
        { status: 400 }
      );
    }

    if (typeof forceOcioArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forceOcioArea debe ser booleano' },
        { status: 400 }
      );
    }

    if (typeof forceTransformationArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forceTransformationArea debe ser booleano' },
        { status: 400 }
      );
    }

    if (forceTransformationArea) {
      if (
        typeof transformationGuestsTarget !== 'number' ||
        transformationGuestsTarget < 1 ||
        transformationGuestsTarget > 20
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'transformationGuestsTarget debe ser un número entre 1 y 20',
          },
          { status: 400 }
        );
      }
    }

    if (typeof forceCommunityServiceArea !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'forceCommunityServiceArea debe ser booleano' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { coordinadorId: true },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el coordinador tiene acceso a esta visión
    if (vision.coordinadorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Verificar si hay participantes con cartas ya iniciadas
    const participantesConCarta = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Participante: {
          include: {
            CartaFrutos: {
              where: {
                estado: {
                  not: 'BORRADOR'
                }
              },
              select: { id: true, estado: true }
            }
          }
        }
      }
    });

    const usuariosConCartaActiva = participantesConCarta.filter(
      p => p.Participante.CartaFrutos.length > 0
    );

    if (usuariosConCartaActiva.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se pueden modificar las áreas de la visión',
          details: `Hay ${usuariosConCartaActiva.length} participante(s) que ya han iniciado su ciclo con el wizard. Para proteger su progreso, no se permiten cambios en la configuración de áreas.`,
          participantesAfectados: usuariosConCartaActiva.length
        },
        { status: 400 }
      );
    }

    // Actualizar la configuración de áreas
    const updatedVision = await prisma.vision.update({
      where: { id: visionId },
      data: {
        forceFinanzasArea,
        forceRelacionesArea,
        forceTalentosArea,
        forceSaludArea,
        forcePazMentalArea,
        forceOcioArea,
        forceTransformationArea,
        transformationGuestsTarget: forceTransformationArea
          ? transformationGuestsTarget
          : null,
        forceCommunityServiceArea,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de áreas actualizada correctamente',
      vision: {
        forceFinanzasArea: updatedVision.forceFinanzasArea,
        forceRelacionesArea: updatedVision.forceRelacionesArea,
        forceTalentosArea: updatedVision.forceTalentosArea,
        forceSaludArea: updatedVision.forceSaludArea,
        forcePazMentalArea: updatedVision.forcePazMentalArea,
        forceOcioArea: updatedVision.forceOcioArea,
        forceTransformationArea: updatedVision.forceTransformationArea,
        transformationGuestsTarget: updatedVision.transformationGuestsTarget,
        forceCommunityServiceArea: updatedVision.forceCommunityServiceArea,
      },
    });
  } catch (error) {
    console.error('Error updating areas configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la configuración de áreas' },
      { status: 500 }
    );
  }
}
