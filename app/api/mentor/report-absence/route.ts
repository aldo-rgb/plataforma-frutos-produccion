import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const student = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            accumulatedMissedCalls: true,
            mentorStatus: true
          }
        }
      }
    });

    if (!student || !student.Usuario_Usuario_assignedMentorIdToUsuario) {
      return NextResponse.json({ error: 'No tienes un mentor asignado' }, { status: 400 });
    }

    const { scheduledTime, reason, subscriptionId, callBookingId } = await request.json();

    if (!scheduledTime) {
      return NextResponse.json({ error: 'Hora programada requerida' }, { status: 400 });
    }

    const mentor = student.Usuario_Usuario_assignedMentorIdToUsuario;

    // Crear el reporte de ausencia
    const report = await prisma.mentorAbsenceReport.create({
      data: {
        studentId: student.id,
        mentorId: mentor.id,
        scheduledTime: new Date(scheduledTime),
        reason: reason || null,
        subscriptionId: subscriptionId || null,
        callBookingId: callBookingId || null,
        status: 'CONFIRMED' // Se confirma automáticamente por el momento
      }
    });

    // Incrementar el contador de faltas del mentor
    const newMissedCallsCount = mentor.accumulatedMissedCalls + 1;
    
    let newStatus = mentor.mentorStatus;
    let isAcceptingNewStudents = true;

    // Aplicar la regla de los 5 strikes
    if (newMissedCallsCount >= 5) {
      newStatus = 'SUSPENDED';
      isAcceptingNewStudents = false;

      // Notificar al admin/coordinador
      await prisma.notification.create({
        data: {
          usuarioId: 1, // Cambiar al ID del admin/coordinador
          type: 'MENTOR_FAILURE_LIMIT',
          title: 'Mentor suspendido por faltas acumuladas',
          message: `El mentor ${mentor.nombre} ha alcanzado el límite de 5 faltas acumuladas. Se requiere intervención manual.`,
          read: false,
          data: JSON.stringify({
            mentorId: mentor.id,
            mentorName: mentor.nombre,
            totalStrikes: newMissedCallsCount,
            reportId: report.id
          })
        }
      });
    } else if (newMissedCallsCount >= 3) {
      newStatus = 'PROBATION';
    }

    // Actualizar el mentor
    await prisma.usuario.update({
      where: { id: mentor.id },
      data: {
        accumulatedMissedCalls: newMissedCallsCount,
        mentorStatus: newStatus,
        isAcceptingNewStudents: isAcceptingNewStudents,
        lastStrikeDate: new Date()
      }
    });

    // Notificar al mentor
    await prisma.notification.create({
      data: {
        usuarioId: mentor.id,
        type: 'ABSENCE_REPORT',
        title: 'Reporte de Inasistencia',
        message: `Has recibido un reporte de inasistencia. Tienes ${newMissedCallsCount}/5 faltas permitidas.`,
        read: false,
        data: JSON.stringify({
          strikes: newMissedCallsCount,
          status: newStatus,
          reportId: report.id,
          studentName: student.nombre
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Reporte enviado exitosamente',
      report: {
        id: report.id,
        mentorName: mentor.nombre,
        currentStrikes: newMissedCallsCount,
        newStatus: newStatus
      }
    });

  } catch (error: any) {
    logger.error('❌ Error reportando ausencia:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar el reporte',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
