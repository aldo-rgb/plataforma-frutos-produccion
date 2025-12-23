import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const reservaId = parseInt(params.id);

    // 1. Buscar la reserva
    const reserva = await prisma.callBooking.findUnique({
      where: { id: reservaId }
    });

    if (!reserva) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la reserva pertenece al usuario
    if (reserva.studentId !== usuario.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta reserva' },
        { status: 403 }
      );
    }

    // 2. VALIDACIÓN DE VENTANA DE GRACIA (1 hora)
    const ahora = new Date();
    const creado = new Date(reserva.createdAt);
    const diferenciaHoras = (ahora.getTime() - creado.getTime()) / 1000 / 60 / 60;

    if (diferenciaHoras > 1) {
      return NextResponse.json(
        { 
          error: 'El período de modificación (1 hora) ha expirado. Contacta a soporte para hacer cambios.',
          code: 'GRACE_PERIOD_EXPIRED'
        },
        { status: 403 }
      );
    }

    // 3. Verificar si es parte de un programa (tiene programEnrollmentId)
    // @ts-ignore - Campo programEnrollmentId existe en schema pero Prisma client necesita regenerarse
    if (reserva.programEnrollmentId) {
      // Si es parte de un programa intensivo, no permitir eliminar solo una sesión
      return NextResponse.json(
        {
          error: 'Esta sesión forma parte del Programa Intensivo de 17 semanas. No puedes eliminar sesiones individuales. Contacta a soporte.',
          code: 'PART_OF_PROGRAM'
        },
        { status: 403 }
      );
    }

    // 4. Eliminar la reserva
    await prisma.callBooking.delete({
      where: { id: reservaId }
    });

    return NextResponse.json({
      success: true,
      message: 'Reserva eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
