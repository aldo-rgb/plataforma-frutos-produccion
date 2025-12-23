import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentor/sessions
 * 
 * Obtiene las sesiones pendientes de completar del mentor
 * Solo muestra sesiones que ya pasaron su fecha programada
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea mentor
    if (session.user.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'Solo mentores pueden acceder' }, { status: 403 });
    }

    const mentorId = session.user.id;

    // Obtener sesiones PENDING o CONFIRMED que ya pasaron su fecha
    const now = new Date();
    
    const bookings = await prisma.callBooking.findMany({
      where: {
        mentorId: mentorId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: {
          lte: now // Solo sesiones que ya deberían haber ocurrido
        }
      },
      include: {
        Usuario_CallBooking_studentIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'desc'
      },
      take: 20 // Últimas 20 sesiones pendientes
    });

    const sessions = bookings.map(booking => ({
      id: booking.id,
      studentName: booking.Usuario_CallBooking_studentIdToUsuario.nombre,
      studentEmail: booking.Usuario_CallBooking_studentIdToUsuario.email,
      scheduledAt: booking.scheduledAt.toISOString(),
      duration: booking.duration,
      status: booking.status,
      type: booking.type,
      meetingLink: booking.meetingLink
    }));

    return NextResponse.json({
      success: true,
      sessions,
      total: sessions.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo sesiones:', error);
    return NextResponse.json(
      { error: 'Error al cargar sesiones' },
      { status: 500 }
    );
  }
}
