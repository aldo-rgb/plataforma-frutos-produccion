import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// PATCH - Revisar evidencia de tarea extraordinaria
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const reviewerId = parseInt(session.user.id);
    const submissionId = parseInt(params.id);
    const body = await request.json();

    const { aprobado, comentarios } = body;

    if (typeof aprobado !== 'boolean') {
      return NextResponse.json(
        { error: 'Campo aprobado es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el revisor sea coordinador/director/school_admin
    const reviewer = await prisma.usuario.findUnique({
      where: { id: reviewerId },
      select: { rol: true, organizationId: true }
    });

    if (!reviewer || !['COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(reviewer.rol)) {
      return NextResponse.json(
        { error: 'No autorizado para revisar tareas' },
        { status: 403 }
      );
    }

    // Obtener la submission con el enrollment del usuario
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        AdminTask: {
          select: {
            id: true,
            titulo: true,
            pointsReward: true
          }
        },
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            missedCallsCount: true,
            ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
              where: { status: 'SUSPENDED' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission no encontrada' },
        { status: 404 }
      );
    }

    const status = aprobado ? 'APPROVED' : 'REJECTED';

    // Actualizar la submission
    await prisma.taskSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        feedbackMentor: comentarios || null,
        puntosGanados: aprobado ? submission.AdminTask.pointsReward : 0
      }
    });

    // Si se aprueba, otorgar la vida extra
    if (aprobado) {
      const usuario = submission.Usuario;
      const enrollment = usuario.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
      
      if (enrollment) {
        // Verificar que no haya usado ya su vida extra
        const fullEnrollment = await prisma.programEnrollment.findUnique({
          where: { id: enrollment.id },
          select: { extraLifeUsed: true, missedCallsCount: true }
        });

        if (fullEnrollment?.extraLifeUsed) {
          return NextResponse.json({
            success: false,
            error: 'El usuario ya utilizó su vida extra. No puede obtener otra por tarea extraordinaria.'
          }, { status: 400 });
        }

        // Otorgar vida extra correctamente:
        // 1. Resetear missedCallsCount a 0
        // 2. Marcar extraLifeUsed = true
        // 3. Cambiar status a ACTIVE
        // 4. Reactivar sesiones futuras canceladas
        await prisma.programEnrollment.update({
          where: { id: enrollment.id },
          data: {
            missedCallsCount: 0,
            status: 'ACTIVE',
            extraLifeUsed: true,
            extraLifeGrantedBy: 'TAREA_EXTRAORDINARIA',
            extraLifeGrantedAt: new Date()
          }
        });

        // Reactivar sesiones futuras canceladas
        await prisma.callBooking.updateMany({
          where: {
            programEnrollmentId: enrollment.id,
            scheduledAt: { gt: new Date() },
            status: 'CANCELLED'
          },
          data: {
            status: 'PENDING'
          }
        });

        logger.debug(`✅ Vida extra otorgada a ${usuario.nombre} por tarea extraordinaria (Enrollment ${enrollment.id})`);
      } else {
        // Fallback: actualizar Usuario.missedCallsCount si no hay enrollment
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            missedCallsCount: 0
          }
        });
        logger.debug(`⚠️ Vida extra otorgada a ${usuario.nombre} (sin enrollment activo)`);
      }

      // Notificar al usuario
      await prisma.notification.create({
        data: {
          userId: usuario.id,
          type: 'SYSTEM_ALERT',
          title: '🎉 Tarea Extraordinaria Aprobada',
          message: `Tu tarea "${submission.AdminTask.titulo}" ha sido aprobada. Has ganado una vida extra, tu cuenta ha sido reactivada y tus sesiones futuras han sido restauradas.`,
          isRead: false
        }
      });
    } else {
      // Notificar rechazo
      await prisma.notification.create({
        data: {
          userId: submission.Usuario.id,
          type: 'SYSTEM_ALERT',
          title: '❌ Tarea Extraordinaria Rechazada',
          message: `Tu tarea "${submission.AdminTask.titulo}" fue rechazada. ${comentarios ? 'Motivo: ' + comentarios : 'Contacta a tu coordinador.'}`,
          isRead: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: aprobado 
        ? 'Tarea aprobada. El participante ha recuperado su vida extra y sus sesiones han sido reactivadas.' 
        : 'Tarea rechazada.'
    });

  } catch (error: any) {
    logger.error('❌ Error revisando tarea:', error);
    return NextResponse.json(
      { 
        error: 'Error al revisar tarea',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
