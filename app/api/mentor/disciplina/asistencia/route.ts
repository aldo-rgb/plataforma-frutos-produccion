import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!mentor || mentor.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { bookingId, present } = await req.json();

    // 1. Obtener info de la cita y del programa asociado
    const booking: any = await prisma.callBooking.findUnique({
      where: { id: bookingId },
      include: { 
        ProgramEnrollment: true,
        Usuario_CallBooking_studentIdToUsuario: {
          select: { nombre: true }
        }
      } as any
    });

    if (!booking) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Verificar que la cita pertenece al mentor
    if (booking.mentorId !== mentor.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 2. Si asistió, solo marcamos el status y listo
    if (present) {
      await prisma.callBooking.update({
        where: { id: bookingId },
        data: { 
          attendanceStatus: 'PRESENT', 
          status: 'COMPLETED',
          completedAt: new Date()
        } as any
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Asistencia confirmada',
        present: true
      });
    }

    // 3. SI FALTÓ (Lógica de Strikes)
    const enrollment = booking.ProgramEnrollment;
    
    if (!enrollment) {
      // Si no hay programa asociado, solo marcar como ausente
      await prisma.callBooking.update({
        where: { id: bookingId },
        data: { 
          attendanceStatus: 'ABSENT', 
          status: 'COMPLETED',
          completedAt: new Date()
        } as any
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Falta registrada',
        present: false
      });
    }

    // Aumentamos contador de faltas
    const nuevosStrikes = enrollment.missedCallsCount + 1;
    const maxStrikes = enrollment.maxMissedAllowed;
    let nuevoStatusPrograma = enrollment.status;
    let isSuspended = false;

    // Verificamos si murió (Game Over)
    if (nuevosStrikes >= maxStrikes) {
      nuevoStatusPrograma = 'SUSPENDED';
      isSuspended = true;
      
      console.log(`🚫 SUSPENSIÓN: ${booking.Usuario_CallBooking_studentIdToUsuario.nombre} alcanzó ${nuevosStrikes} faltas`);
      
      // ELIMINACIÓN AUTOMÁTICA DE FUTURAS CITAS
      const futureBookings = await prisma.callBooking.deleteMany({
        where: {
          programEnrollmentId: enrollment.id,
          scheduledAt: { gt: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        } as any
      });

      console.log(`🗑️ Canceladas ${futureBookings.count} llamadas futuras`);
    }

    // Transacción para guardar todo
    await prisma.$transaction([
      // Marcar la cita actual como "Ausente"
      prisma.callBooking.update({
        where: { id: bookingId },
        data: { 
          attendanceStatus: 'ABSENT', 
          status: 'COMPLETED',
          completedAt: new Date()
        } as any
      }),
      // Actualizar el contador de strikes y status del programa
      (prisma as any).programEnrollment.update({
        where: { id: enrollment.id },
        data: { 
          missedCallsCount: nuevosStrikes,
          status: nuevoStatusPrograma,
          updatedAt: new Date()
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      strikes: nuevosStrikes,
      maxStrikes: maxStrikes,
      isSuspended,
      message: isSuspended 
        ? `Alumno suspendido por ${nuevosStrikes} faltas` 
        : `Falta registrada (${nuevosStrikes}/${maxStrikes})`
    });

  } catch (error) {
    console.error('Error registrando asistencia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
