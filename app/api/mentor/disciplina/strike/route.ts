import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendStrikeMessage } from '@/lib/strikeMessaging';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 });
    }

    // Verificar que el booking existe y obtener el enrollment
    const booking = await prisma.callBooking.findUnique({
      where: { id: bookingId },
      include: {
        ProgramEnrollment: {
          include: {
            Usuario_ProgramEnrollment_userIdToUsuario: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Llamada no encontrada' }, { status: 404 });
    }

    // Verificar que el mentor es el propietario
    const mentor = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    if (!mentor || (mentor.rol !== 'MENTOR' && mentor.rol !== 'LIDER')) {
      return NextResponse.json({ error: 'Usuario no es mentor' }, { status: 403 });
    }

    if (booking.ProgramEnrollment.mentorId !== mentor.id) {
      return NextResponse.json({ error: 'No tienes permiso para gestionar esta llamada' }, { status: 403 });
    }

    // Marcar como ausente
    await prisma.callBooking.update({
      where: { id: bookingId },
      data: { 
        attendanceStatus: 'ABSENT',
        status: 'COMPLETED'
      }
    });

    // Incrementar missedCallsCount
    const enrollmentActualizado = await prisma.programEnrollment.update({
      where: { id: booking.programEnrollmentId },
      data: {
        missedCallsCount: {
          increment: 1
        }
      }
    });

    const totalStrikes = enrollmentActualizado.missedCallsCount;
    const maxStrikes = enrollmentActualizado.maxMissedAllowed || 3;
    const extraLifeUsed = enrollmentActualizado.extraLifeUsed;

    // Obtener información del usuario para mensajes
    const student = booking.ProgramEnrollment.Usuario_ProgramEnrollment_userIdToUsuario;
    
    // Obtener visionId del enrollment si existe (para generar ticket en DROP)
    let visionId: number | undefined;
    const visionEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: student.id,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      },
      select: { visionId: true }
    });
    visionId = visionEnrollment?.visionId;

    let suspended = false;
    let isDrop = false;
    let messageResult;

    /**
     * LÓGICA DE STRIKES:
     * 
     * Strike 1: Solo registro, sin mensaje
     * Strike 2: Envía video "2da Llamada Perdida"
     * Strike 3: Envía video "3ra Llamada" + SUSPENDE (puede comprar vida extra por 1000 PC)
     * Strike 4 (si ya usó vida extra): Envía video "Cierre Líderes Tu Vida" + DROP + genera ticket
     */

    if (totalStrikes >= maxStrikes) {
      // Verificar si ya usó su vida extra
      if (extraLifeUsed) {
        // STRIKE 4: DROP definitivo
        isDrop = true;
        logger.debug(`💔 DROP para usuario ${student.id} - Ya usó vida extra y llegó a ${totalStrikes} faltas`);

        // Cancelar todas las sesiones futuras
        await prisma.callBooking.updateMany({
          where: {
            programEnrollmentId: booking.programEnrollmentId,
            scheduledAt: { gt: new Date() },
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          data: { status: 'CANCELLED' }
        });

        // Marcar enrollment como DROP (no SUSPENDED)
        await prisma.programEnrollment.update({
          where: { id: booking.programEnrollmentId },
          data: { status: 'DROP' }
        });

        // Enviar mensaje de cierre + generar ticket
        messageResult = await sendStrikeMessage(
          {
            id: student.id,
            nombre: student.nombre || 'Participante',
            email: student.email,
            telefono: student.telefono,
            organizationId: student.organizationId
          },
          4, // Strike 4 = DROP
          booking.programEnrollmentId,
          visionId
        );

      } else {
        // STRIKE 3: Suspensión con opción de vida extra
        suspended = true;
        logger.debug(`⏸️ Suspendiendo usuario ${student.id} - ${totalStrikes} faltas`);

        // Cancelar sesiones futuras
        await prisma.callBooking.updateMany({
          where: {
            programEnrollmentId: booking.programEnrollmentId,
            scheduledAt: { gt: new Date() },
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          data: { status: 'CANCELLED' }
        });

        // Marcar como SUSPENDED
        await prisma.programEnrollment.update({
          where: { id: booking.programEnrollmentId },
          data: { status: 'SUSPENDED' }
        });

        // Enviar mensaje de 3ra llamada
        messageResult = await sendStrikeMessage(
          {
            id: student.id,
            nombre: student.nombre || 'Participante',
            email: student.email,
            telefono: student.telefono,
            organizationId: student.organizationId
          },
          3,
          booking.programEnrollmentId,
          visionId
        );
      }
    } else if (totalStrikes === 2) {
      // STRIKE 2: Advertencia con video
      messageResult = await sendStrikeMessage(
        {
          id: student.id,
          nombre: student.nombre || 'Participante',
          email: student.email,
          telefono: student.telefono,
          organizationId: student.organizationId
        },
        2,
        booking.programEnrollmentId,
        visionId
      );
    }
    // Strike 1: No se envía mensaje

    // Log del resultado del mensaje
    if (messageResult) {
      logger.debug(`📨 Mensaje de strike ${totalStrikes} para ${student.nombre}:`, messageResult);
    }

    return NextResponse.json({
      success: true,
      suspended,
      isDrop,
      totalStrikes,
      maxStrikes,
      extraLifeUsed,
      messageSent: messageResult?.success || false,
      ticketGenerated: messageResult?.ticketGenerated || false,
      message: isDrop 
        ? `Usuario marcado como DROP. Se generó ticket para siguiente visión.`
        : suspended 
          ? `Usuario suspendido por alcanzar ${totalStrikes} faltas. Puede comprar vida extra (1000 PC).`
          : `Strike registrado. Total: ${totalStrikes}/${maxStrikes}`
    });

  } catch (error) {
    logger.error('Error registrando strike:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error registrando strike' 
    }, { status: 500 });
  }
}
