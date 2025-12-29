import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'COORDINADOR') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const visionId = parseInt(params.id);
    const { participanteRelationId } = await request.json();

    if (isNaN(visionId) || !participanteRelationId) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Verificar que la visión pertenece a la organización del coordinador
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

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

    // Obtener información del participante o game changer antes de eliminarlo
    let participanteRelation = await prisma.visionParticipante.findUnique({
      where: { id: participanteRelationId },
      include: {
        Participante: {
          select: {
            id: true,
            licenseCode: true,
          }
        }
      }
    });

    let gameChangerRelation = null;
    let userToUpdate = null;
    let licenseCode = null;
    let isGameChanger = false;

    // Si no es un participante, buscar en game changers
    if (!participanteRelation) {
      gameChangerRelation = await prisma.visionGameChanger.findUnique({
        where: { id: participanteRelationId },
        include: {
          GameChanger: {
            select: {
              id: true,
              licenseCode: true,
            }
          }
        }
      });

      if (!gameChangerRelation) {
        return NextResponse.json(
          { success: false, error: 'Usuario no encontrado en esta visión' },
          { status: 404 }
        );
      }

      isGameChanger = true;
      userToUpdate = gameChangerRelation.GameChanger;
      licenseCode = gameChangerRelation.GameChanger.licenseCode;
    } else {
      userToUpdate = participanteRelation.Participante;
      licenseCode = participanteRelation.Participante.licenseCode;
    }

    // Si el usuario tiene licencia asignada, cancelarla
    if (licenseCode) {
      try {
        // Buscar la licencia
        const license = await prisma.license.findUnique({
          where: { code: licenseCode }
        });

        if (license) {
          // Cancelar la licencia
          await prisma.license.update({
            where: { id: license.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
            }
          });

          // Remover el código de licencia del usuario
          await prisma.usuario.update({
            where: { id: userToUpdate.id },
            data: {
              licenseCode: null,
              tier: 'FREE'
            }
          });

          console.log(`Licencia ${licenseCode} cancelada al eliminar ${isGameChanger ? 'game changer' : 'participante'}`);
        }
      } catch (licenseError) {
        console.error('Error al cancelar licencia:', licenseError);
        // Continuar con la eliminación aunque falle la cancelación
      }
    }

    // Eliminar la relación correspondiente
    if (isGameChanger) {
      await prisma.visionGameChanger.delete({
        where: { id: participanteRelationId },
      });
    } else {
      await prisma.visionParticipante.delete({
        where: { id: participanteRelationId },
      });
    }

    const userType = isGameChanger ? 'Game Changer' : 'Participante';
    return NextResponse.json({
      success: true,
      message: licenseCode 
        ? `${userType} eliminado de la visión y licencia cancelada`
        : `${userType} eliminado de la visión`,
    });
  } catch (error) {
    console.error('Error removing participante from vision:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar participante' },
      { status: 500 }
    );
  }
}
