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

    if (!session?.user || session.user.rol !== 'GAMECHANGER') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const participanteId = parseInt(id);

    if (isNaN(participanteId)) {
      return NextResponse.json(
        { success: false, error: 'ID de participante inválido' },
        { status: 400 }
      );
    }

    // Obtener el participante con su carta
    // @ts-ignore - Prisma relations
    const participante = await prisma.usuario.findUnique({
      where: { id: participanteId },
      include: {
        CartaFrutos: {
          include: {
            Meta: {
              include: {
                Accion: true
              }
            }
          }
        },
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!participante) {
      return NextResponse.json(
        { success: false, error: 'Participante no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el participante esté asignado a este GAMECHANGER y obtener la visión
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: {
        participanteId: participanteId,
        gameChangerId: session.user.id
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            forceTransformationArea: true,
            forceCommunityServiceArea: true,
            forceFinanzasArea: true,
            forceRelacionesArea: true,
            forceSaludArea: true,
            forceOcioArea: true,
            forceTalentosArea: true,
            forcePazMentalArea: true
          }
        }
      }
    });

    if (!visionParticipante) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a este participante' },
        { status: 403 }
      );
    }

    // @ts-ignore - Prisma relations
    const carta = participante.CartaFrutos[0];

    if (!carta) {
      return NextResponse.json(
        { success: false, error: 'Este participante no tiene carta' },
        { status: 404 }
      );
    }

    // Solo permitir ver cartas autorizadas
    if (!carta.autorizadoMentor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Solo puedes ver cartas autorizadas',
          cartaEstado: carta.estado,
          autorizacion: carta.autorizadoMentor
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      carta: {
        ...carta,
        Meta: carta.Meta
      },
      participante: {
        id: participante.id,
        nombre: participante.nombre,
        email: participante.email,
        // @ts-ignore - Prisma relations
        mentor: participante.Usuario_Usuario_assignedMentorIdToUsuario
      },
      visionConfig: visionParticipante.Vision
    });

  } catch (error) {
    console.error('Error fetching carta for GAMECHANGER:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la carta' },
      { status: 500 }
    );
  }
}
