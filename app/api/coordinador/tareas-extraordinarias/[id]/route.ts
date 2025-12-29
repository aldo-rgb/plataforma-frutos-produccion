import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Obtener la submission
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
            missedCallsCount: true
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
      
      // Si tiene 3 o más llamadas perdidas, está bloqueado
      // Al aprobar la tarea, resetear a 2 llamadas perdidas (vida extra)
      if (usuario.missedCallsCount >= 3) {
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            missedCallsCount: 2 // Le damos una vida extra
          }
        });
      }

      // Notificar al usuario
      await prisma.notification.create({
        data: {
          userId: usuario.id,
          type: 'SYSTEM_ALERT',
          title: '🎉 Tarea Extraordinaria Aprobada',
          message: `Tu tarea "${submission.AdminTask.titulo}" ha sido aprobada. Has ganado una vida extra y tu cuenta ha sido reactivada.`,
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
        ? 'Tarea aprobada. El participante ha recuperado su vida extra.' 
        : 'Tarea rechazada.'
    });
        }
      });
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: aprobado ? 'Tarea aprobada y vida extra otorgada' : 'Tarea rechazada'
    });

  } catch (error: any) {
    console.error('❌ Error revisando tarea:', error);
    return NextResponse.json(
      { 
        error: 'Error al revisar tarea',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
