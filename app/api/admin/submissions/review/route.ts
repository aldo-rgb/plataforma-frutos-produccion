import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/admin/submissions/review
 * Revisa submissions de tareas extraordinarias y eventos
 * Para ADMIN, COORDINADOR, DIRECTOR
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true 
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que sea ADMIN, COORDINADOR, DIRECTOR o SCHOOL_ADMIN
    const rolesPermitidos = ['ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      return NextResponse.json({ 
        error: 'Acceso denegado',
        mensaje: 'Solo Admin, Coordinador, Director y School Admin pueden revisar estas evidencias'
      }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, action, feedback } = body;

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

    // Obtener submission con detalles
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            organizationId: true,
            visionId: true
          }
        },
        AdminTask: {
          select: {
            id: true,
            type: true,
            titulo: true,
            pointsReward: true,
            parentTaskId: true,
            isMultiDay: true,
            diaNumero: true
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission no encontrada' }, { status: 404 });
    }

    // Verificar permisos según rol
    if (usuario.rol === 'DIRECTOR') {
      if (submission.Usuario.organizationId !== usuario.organizationId) {
        return NextResponse.json({ 
          error: 'No tienes permiso para revisar esta evidencia' 
        }, { status: 403 });
      }
    } else if (usuario.rol === 'COORDINADOR') {
      if (usuario.organizationId) {
        if (submission.Usuario.organizationId !== usuario.organizationId) {
          return NextResponse.json({ 
            error: 'No tienes permiso para revisar esta evidencia' 
          }, { status: 403 });
        }
      } else {
        // Verificar que el usuario esté en alguna visión del coordinador
        const visiones = await prisma.vision.findMany({
          where: { coordinadorId: usuario.id },
          select: { id: true }
        });
        const visionIds = visiones.map(v => v.id);
        if (!submission.Usuario.visionId || !visionIds.includes(submission.Usuario.visionId)) {
          return NextResponse.json({ 
            error: 'No tienes permiso para revisar esta evidencia' 
          }, { status: 403 });
        }
      }
    }
    // ADMIN puede revisar todas

    // Validar que esté en estado revisable
    if (!['SUBMITTED', 'PENDING', 'REJECTED'].includes(submission.status)) {
      return NextResponse.json(
        { 
          error: 'Esta submission ya fue procesada',
          currentStatus: submission.status 
        },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // APROBAR: Actualizar submission y otorgar puntos
      const [updatedSubmission] = await prisma.$transaction([
        // Actualizar submission
        prisma.taskSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: usuario.id,
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
        `✅ ${usuario.rol} ${usuario.id} APROBÓ submission ${submissionId} ` +
        `de ${submission.Usuario.nombre} - ` +
        `Otorgados ${submission.AdminTask.pointsReward} PC`
      );

      // 🗓️ VERIFICAR SI ES PARTE DE UNA MISIÓN MULTI-DÍA
      let multiDayBonus = 0;
      if (submission.AdminTask.parentTaskId) {
        logger.debug(`🗓️ Esta tarea es parte de una misión multi-día (Parent: ${submission.AdminTask.parentTaskId})`);
        
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
          const todasCompletadas = parentTask.DailyTasks.every(tarea => 
            tarea.Submissions.length > 0 && 
            tarea.Submissions[0].status === 'APPROVED'
          );

          if (todasCompletadas) {
            logger.debug(`🎉 Usuario ${submission.usuarioId} completó TODA la misión multi-día "${parentTask.titulo}"!`);
            
            await prisma.usuario.update({
              where: { id: submission.usuarioId },
              data: {
                puntosCuanticos: {
                  increment: parentTask.pointsReward
                }
              }
            });

            multiDayBonus = parentTask.pointsReward;
            logger.debug(`💰 Bonus otorgado: ${parentTask.pointsReward} PC por completar misión de ${parentTask.duracionDias} días`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        submission: updatedSubmission,
        pointsAwarded: submission.AdminTask.pointsReward,
        multiDayBonus
      });

    } else {
      // RECHAZAR
      const updatedSubmission = await prisma.taskSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: usuario.id,
          feedbackMentor: feedback || 'Rechazado',
          evidenciaUrl: null,
          comentario: null,
          puntosGanados: 0
        }
      });

      logger.debug(
        `❌ ${usuario.rol} ${usuario.id} RECHAZÓ submission ${submissionId} ` +
        `de ${submission.Usuario.nombre} - Feedback: ${feedback}`
      );

      return NextResponse.json({
        success: true,
        action: 'rejected',
        submission: updatedSubmission
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
