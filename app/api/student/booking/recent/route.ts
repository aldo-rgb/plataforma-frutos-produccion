import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
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

    // Obtener reservas creadas en las últimas 24 horas (para mostrar ventana de gracia)
    const hace24Horas = new Date();
    hace24Horas.setHours(hace24Horas.getHours() - 24);

    const bookings = await prisma.callBooking.findMany({
      where: {
        studentId: usuario.id,
        createdAt: {
          gte: hace24Horas
        },
        // Solo mostrar las que están pendientes o confirmadas
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('Error obteniendo reservas recientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
