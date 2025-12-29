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
    const participanteId = parseInt(id);

    if (isNaN(participanteId)) {
      return NextResponse.json(
        { success: false, error: 'ID de participante inválido' },
        { status: 400 }
      );
    }

    // Verificar que el coordinador tiene acceso a este participante
    const coordinador = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, organizationId: true }
    });

    if (!coordinador) {
      return NextResponse.json(
        { success: false, error: 'Coordinador no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el participante con su carta
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
        },
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                coordinadorId: true,
                forceTransformationArea: true,
                forceCommunityServiceArea: true,
                organizationId: true,
                estado: true
              }
            }
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

    // Verificar acceso del coordinador
    const hasAccess = participante.ProgramEnrollment_ProgramEnrollment_userIdToUsuario.some(
      (enrollment: any) => 
        enrollment.Vision.coordinadorId === coordinador.id ||
        (coordinador.organizationId && enrollment.Vision.organizationId === coordinador.organizationId)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a este participante' },
        { status: 403 }
      );
    }

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

    // Obtener configuración de la visión (si hay enrollment activo)
    const activeEnrollment = participante.ProgramEnrollment_ProgramEnrollment_userIdToUsuario.find((e: any) => e.Vision.estado === 'ACTIVA');
    const visionConfig = activeEnrollment?.Vision || null;

    return NextResponse.json({
      success: true,
      carta: {
        id: carta.id,
        estado: carta.estado,
        autorizadoMentor: carta.autorizadoMentor,
        fechaCreacion: carta.fechaCreacion,
        finanzasIdentidad: carta.finanzasIdentidad,
        finanzasDeclaracion: carta.finanzasDeclaracion,
        relacionesIdentidad: carta.relacionesIdentidad,
        relacionesDeclaracion: carta.relacionesDeclaracion,
        saludIdentidad: carta.saludIdentidad,
        saludDeclaracion: carta.saludDeclaracion,
        ocioIdentidad: carta.ocioIdentidad,
        ocioDeclaracion: carta.ocioDeclaracion,
        talentosIdentidad: carta.talentosIdentidad,
        talentosDeclaracion: carta.talentosDeclaracion,
        pazMentalIdentidad: carta.pazMentalIdentidad,
        pazMentalDeclaracion: carta.pazMentalDeclaracion,
        transformacionIdentidad: carta.transformacionIdentidad,
        transformacionDeclaracion: carta.transformacionDeclaracion,
        servicioIdentidad: carta.servicioIdentidad,
        servicioDeclaracion: carta.servicioDeclaracion,
        Meta: carta.Meta
      },
      participante: {
        id: participante.id,
        nombre: participante.nombre,
        email: participante.email,
        mentor: participante.Usuario_Usuario_assignedMentorIdToUsuario
      },
      visionConfig
    });

  } catch (error) {
    console.error('Error fetching carta for coordinator:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la carta' },
      { status: 500 }
    );
  }
}
