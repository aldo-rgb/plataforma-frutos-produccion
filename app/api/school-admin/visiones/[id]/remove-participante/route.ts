import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(
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
    const { participanteRelationId } = await request.json();

    logger.debug(`🗑️ Intentando eliminar participante/GC con relationId: ${participanteRelationId} (tipo: ${typeof participanteRelationId}) de visión ${visionId}`);

    if (isNaN(visionId) || !participanteRelationId) {
      logger.error(`Datos inválidos: visionId=${visionId}, participanteRelationId=${participanteRelationId}`);
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Verificar que la visión pertenece a la organización del director
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

    // Asegurar que participanteRelationId sea un número
    const relationId = typeof participanteRelationId === 'string' 
      ? parseInt(participanteRelationId) 
      : participanteRelationId;
    
    if (isNaN(relationId)) {
      logger.error(`relationId no es un número válido: ${participanteRelationId}`);
      return NextResponse.json(
        { success: false, error: 'ID de relación inválido' },
        { status: 400 }
      );
    }

    logger.debug(`🔍 Buscando relationId: ${relationId} en vision_enrollments, VisionParticipante y VisionGameChanger`);

    // PRIMERO: Buscar en vision_enrollments (sistema nuevo)
    const enrollment = await prisma.vision_enrollments.findUnique({
      where: { id: relationId },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            licenseCode: true,
          }
        }
      }
    });

    if (enrollment) {
      logger.debug(`📋 Encontrado enrollment para userId: ${enrollment.userId}`);
      
      // Cancelar LicenseAssignment si existe
      const licenseAssignment = await prisma.licenseAssignment.findFirst({
        where: {
          userId: enrollment.userId,
          visionId: visionId,
          isActive: true
        }
      });

      if (licenseAssignment) {
        await prisma.licenseAssignment.update({
          where: { id: licenseAssignment.id },
          data: {
            isActive: false,
            deactivatedAt: new Date()
          }
        });
        logger.debug(`🔑 Licencia ${licenseAssignment.licenseCode} desactivada`);
      }

      // Marcar enrollment como DROP
      await prisma.vision_enrollments.update({
        where: { id: relationId },
        data: {
          enrollmentStatus: 'DROP',
          attendanceStatus: 'DROP',
          droppedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: licenseAssignment 
          ? 'Participante eliminado de la visión y licencia desactivada'
          : 'Participante eliminado de la visión',
      });
    }

    // SEGUNDO: Buscar en VisionParticipante (sistema legacy)
    let participanteRelation = await prisma.visionParticipante.findUnique({
      where: { id: relationId },
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

    // Si no es un participante legacy, buscar en game changers
    if (!participanteRelation) {
      gameChangerRelation = await prisma.visionGameChanger.findUnique({
        where: { id: relationId },
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

          logger.debug(`Licencia ${licenseCode} cancelada al eliminar ${isGameChanger ? 'game changer' : 'participante'}`);
        }
      } catch (licenseError) {
        logger.error('Error al cancelar licencia:', licenseError);
        // Continuar con la eliminación aunque falle la cancelación
      }
    }

    // Eliminar la relación correspondiente
    if (isGameChanger) {
      await prisma.visionGameChanger.delete({
        where: { id: relationId },
      });
    } else {
      await prisma.visionParticipante.delete({
        where: { id: relationId },
      });
    }

    const userType = isGameChanger ? 'Game Changer' : 'Participante';
    return NextResponse.json({
      success: true,
      message: licenseCode 
        ? `${userType} eliminado de la visión y licencia cancelada`
        : `${userType} eliminado de la visión`,
    });
  } catch (error: any) {
    logger.error('Error removing participante from vision:', error);
    logger.error('Error details:', error?.message, error?.code);
    return NextResponse.json(
      { success: false, error: `Error al eliminar participante: ${error?.message || 'Error desconocido'}` },
      { status: 500 }
    );
  }
}
