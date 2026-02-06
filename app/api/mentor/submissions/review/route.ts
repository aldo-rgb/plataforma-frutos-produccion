import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyEvidenciaRechazada } from '@/lib/notifications';
import logger from '@/lib/logger';

/**
 * POST /api/mentor/submissions/review
 * Aprueba o rechaza una submission de tarea extraordinaria/evento
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mentorId = session.user.id;
    const body = await req.json();
    const { submissionId, action, feedback } = body;

    // Validaciones
    if (!submissionId || !action) {
      return NextResponse.json(
        { error: 'submissionId y action son requeridos' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action debe ser "approve" o "reject"' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !feedback?.trim()) {
      return NextResponse.json(
        { error: 'El feedback es requerido al rechazar' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea mentor
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId }
    });

    if (!mentor || (mentor.rol !== 'MENTOR' && mentor.rol !== 'LIDER')) {
      return NextResponse.json(
        { error: 'Solo los mentores pueden revisar evidencias' },
        { status: 403 }
      );
    }

    // Obtener la submission y verificar que pertenece a un mentorado del mentor
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            assignedMentorId: true,
            puntosCuanticos: true
          }
        },
        AdminTask: {
          select: {
            id: true,
            titulo: true,
            pointsReward: true,
            type: true,
            fechaLimite: true,
            horaEvento: true,
            parentTaskId: true,
            isMultiDay: true,
            diaNumero: true
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

    // BLOQUEAR revisión de tareas extraordinarias y eventos por mentores
    if (submission.AdminTask.type === 'EXTRAORDINARY' || submission.AdminTask.type === 'EVENT') {
      return NextResponse.json(
        { 
          error: 'Las tareas extraordinarias y eventos son revisadas por Admin, Coordinador o Director',
          mensaje: 'Esta evidencia debe ser revisada por el equipo administrativo'
        },
        { status: 403 }
      );
    }

    // Verificar que el usuario es mentorado del mentor
    if (submission.Usuario.assignedMentorId !== mentorId) {
      return NextResponse.json(
        { error: 'Este usuario no es tu mentorado' },
        { status: 403 }
      );
    }

    // Verificar que está en estado SUBMITTED
    if (submission.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Esta submission ya fue revisada' },
        { status: 400 }
      );
    }

    // 🔒 VALIDACIÓN CRÍTICA: Verificar si la evidencia fue subida A TIEMPO
    if (submission.AdminTask.type === 'EXTRAORDINARY' && submission.AdminTask.fechaLimite && submission.submittedAt) {
      // Extraer componentes UTC y reconstruir en hora local
      const deadlineUTC = new Date(submission.AdminTask.fechaLimite);
      const year = deadlineUTC.getUTCFullYear();
      const month = deadlineUTC.getUTCMonth();
      const day = deadlineUTC.getUTCDate();
      const deadline = new Date(year, month, day);
      
      // Aplicar hora límite
      if (submission.AdminTask.horaEvento) {
        const [hours, minutes] = submission.AdminTask.horaEvento.split(':');
        deadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        deadline.setHours(23, 59, 59, 999);
      }

      // Si la evidencia fue subida DESPUÉS del deadline, NO se puede aprobar
      if (submission.submittedAt > deadline) {
        return NextResponse.json(
          { 
            error: '⏰ Evidencia fuera de tiempo',
            message: `La evidencia fue subida después del deadline (${deadline.toLocaleString('es-MX')}). No se pueden otorgar puntos.`,
            deadlinePassed: true,
            submittedAt: submission.submittedAt.toLocaleString('es-MX'),
            deadline: deadline.toLocaleString('es-MX')
          },
          { status: 400 }
        );
      }
    }

    if (action === 'approve') {
      // APROBAR: Actualizar submission y otorgar puntos
      const [updatedSubmission, updatedUsuario] = await prisma.$transaction([
        // Actualizar submission
        prisma.taskSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: mentorId,
            feedbackMentor: feedback || 'Aprobado',
            puntosGanados: submission.AdminTask.pointsReward
          }
        }),
        // Otorgar puntos al usuario
        prisma.usuario.update({
          where: { id: submission.usuarioId },
          data: {
            puntosCuanticos: {
              increment: submission.AdminTask.pointsReward
            }
          }
        })
      ]);

      logger.debug(
        `✅ Mentor ${mentorId} APROBÓ submission ${submissionId} ` +
        `de ${submission.Usuario.nombre} - ` +
        `Otorgados ${submission.AdminTask.pointsReward} PC`
      );

      // 🗓️ VERIFICAR SI ES PARTE DE UNA MISIÓN MULTI-DÍA
      if (submission.AdminTask.parentTaskId) {
        logger.debug(`🗓️ Esta tarea es parte de una misión multi-día (Parent: ${submission.AdminTask.parentTaskId})`);
        
        // Obtener todas las tareas hermanas de esta misión multi-día
        const parentTask = await prisma.adminTask.findUnique({
          where: { id: submission.AdminTask.parentTaskId },
          include: {
            DailyTasks: {
              include: {
                Submissions: {
                  where: {
                    usuarioId: submission.usuarioId
                  }
                }
              }
            }
          }
        });

        if (parentTask) {
          // Verificar si el usuario completó TODAS las tareas diarias
          const todasCompletadas = parentTask.DailyTasks.every(tarea => 
            tarea.Submissions.length > 0 && 
            tarea.Submissions[0].status === 'APPROVED'
          );

          if (todasCompletadas) {
            logger.debug(`🎉 Usuario ${submission.usuarioId} completó TODA la misión multi-día "${parentTask.titulo}"!`);
            
            // Otorgar los puntos del premio completo
            await prisma.usuario.update({
              where: { id: submission.usuarioId },
              data: {
                puntosCuanticos: {
                  increment: parentTask.pointsReward
                }
              }
            });

            logger.debug(`💰 Bonus otorgado: ${parentTask.pointsReward} PC por completar misión de ${parentTask.duracionDias} días`);
          } else {
            const diasCompletados = parentTask.DailyTasks.filter(tarea => 
              tarea.Submissions.length > 0 && 
              tarea.Submissions[0].status === 'APPROVED'
            ).length;
            logger.debug(`📊 Progreso: ${diasCompletados}/${parentTask.duracionDias} días completados`);
          }
        }
      }

      // Crear notificación (opcional - si tienes sistema de notificaciones)
      // await prisma.notification.create({...})

      return NextResponse.json({
        success: true,
        action: 'approved',
        submission: updatedSubmission,
        pointsAwarded: submission.AdminTask.pointsReward
      });

    } else {
      // RECHAZAR: Mantener status REJECTED con feedback para que usuario vea el rechazo
      const updatedSubmission = await prisma.taskSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: mentorId,
          feedbackMentor: feedback,
          // Limpiar evidencia anterior para permitir reenvío
          evidenciaUrl: null,
          comentario: null,
          puntosGanados: 0
        }
      });

      logger.debug(
        `❌ Mentor ${mentorId} RECHAZÓ submission ${submissionId} ` +
        `de ${submission.Usuario.nombre} - Feedback: ${feedback}`
      );

      // 📧 ENVIAR NOTIFICACIÓN AL USUARIO
      await notifyEvidenciaRechazada(
        submission.usuarioId,
        submission.AdminTask.titulo,
        feedback,
        submission.AdminTask.type
      );

      return NextResponse.json({
        success: true,
        action: 'rejected',
        submission: updatedSubmission,
        message: 'Evidencia rechazada. El usuario ha sido notificado.'
      });
    }

  } catch (error: any) {
    logger.error('❌ Error revisando submission:', error);
    return NextResponse.json(
      { error: 'Error al revisar submission', details: error.message },
      { status: 500 }
    );
  }
}
