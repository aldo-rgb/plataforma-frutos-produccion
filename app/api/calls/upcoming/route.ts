import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    
    // Obtener llamadas desde hoy hasta 7 días adelante
    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(addDays(targetDate, 7));

    // Buscar llamadas programadas
    const upcomingCalls = await prisma.callBooking.findMany({
      where: {
        studentId: user.id,
        scheduledAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      include: {
        ProgramEnrollment: true,
        Usuario_CallBooking_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    console.log(`📞 Llamadas encontradas para usuario ${user.id}:`, upcomingCalls.length);

    // Formatear respuesta
    const formattedCalls = upcomingCalls.map((call: any) => {
      const scheduledDate = new Date(call.scheduledAt);
      
      return {
        id: call.id,
        type: call.type || 'DISCIPLINE',
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        scheduledTime: scheduledDate.toISOString().split('T')[1].substring(0, 5),
        status: call.status,
        meetingLink: call.meetingLink,
        mentor: {
          id: call.Usuario_CallBooking_mentorIdToUsuario.id,
          nombre: call.Usuario_CallBooking_mentorIdToUsuario.nombre,
          imagen: call.Usuario_CallBooking_mentorIdToUsuario.profileImage
        },
        weekNumber: call.weekNumber,
        duration: call.duration
      };
    });

    return NextResponse.json({
      calls: formattedCalls,
      total: formattedCalls.length
    });

  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    return NextResponse.json(
      { error: 'Error al obtener llamadas' },
      { status: 500 }
    );
  }
}
