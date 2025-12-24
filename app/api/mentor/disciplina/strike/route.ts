import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import prisma from '@/lib/prisma';

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

    if (!mentor || mentor.rol !== 'MENTOR') {
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

    // Verificar si debe suspender al usuario
    let suspended = false;
    if (totalStrikes >= maxStrikes) {
      suspended = true;

      // Cancelar todas las sesiones futuras del usuario
      await prisma.callBooking.updateMany({
        where: {
          programEnrollmentId: booking.programEnrollmentId,
          scheduledAt: { gt: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        data: {
          status: 'CANCELLED'
        }
      });

      // Marcar enrollment como SUSPENDED
      await prisma.programEnrollment.update({
        where: { id: booking.programEnrollmentId },
        data: { status: 'SUSPENDED' }
      });

      // Opcional: Desactivar usuario
      // await prisma.usuario.update({
      //   where: { id: booking.ProgramEnrollment.userId },
      //   data: { isActive: false }
      // });
    }

    return NextResponse.json({
      success: true,
      suspended,
      totalStrikes,
      maxStrikes,
      message: suspended 
        ? `Usuario suspendido por alcanzar ${totalStrikes} faltas` 
        : `Strike registrado. Total: ${totalStrikes}/${maxStrikes}`
    });

  } catch (error) {
    console.error('Error registrando strike:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error registrando strike' 
    }, { status: 500 });
  }
}
