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

    // Buscar subscripciones de disciplinas del usuario
    const userSubscriptions = await prisma.disciplineSubscription.findMany({
      where: { studentId: user.id },
      select: { id: true }
    });

    const subscriptionIds = userSubscriptions.map(sub => sub.id);
    console.log(`📞 Subscripciones de disciplina encontradas: ${subscriptionIds.length}`);

    // Buscar llamadas programadas (tanto de disciplina como de visiones/programas)
    const upcomingCalls = await prisma.callBooking.findMany({
      where: {
        OR: [
          // Llamadas de programas intensivos
          {
            programEnrollment: {
              usuarioId: user.id,
              status: 'ACTIVE'
            }
          },
          // Llamadas de disciplinas
          ...(subscriptionIds.length > 0 ? [{
            subscriptionId: {
              in: subscriptionIds
            }
          }] : [])
        ],
        scheduledDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      },
      include: {
        programEnrollment: {
          include: {
            vision: {
              select: {
                id: true,
                nombre: true
              }
            },
            mentor: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          }
        },
        subscription: {
          include: {
            discipline: {
              select: {
                id: true,
                name: true,
                icon: true
              }
            },
            mentor: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    console.log(`📞 Llamadas encontradas para usuario ${user.id}:`, upcomingCalls.length);

    // Formatear respuesta
    const formattedCalls = upcomingCalls.map((call: any) => {
      const isDiscipline = !!call.subscriptionId;
      const isVision = !!call.programEnrollmentId;

      return {
        id: call.id,
        type: isDiscipline ? 'DISCIPLINE' : 'VISION',
        scheduledDate: call.scheduledDate,
        scheduledTime: call.scheduledTime,
        status: call.status,
        meetingUrl: call.meetingUrl,
        discipline: isDiscipline ? {
          id: call.subscription?.discipline.id,
          name: call.subscription?.discipline.name,
          icon: call.subscription?.discipline.icon
        } : null,
        vision: isVision ? {
          id: call.programEnrollment?.vision?.id,
          name: call.programEnrollment?.vision?.nombre
        } : null,
        mentor: isDiscipline 
          ? call.subscription?.mentor 
          : call.programEnrollment?.mentor,
        weekNumber: call.weekNumber
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
