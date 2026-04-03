import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import logger from '@/lib/logger';

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

    // 1. Buscar llamadas de mentoría (CallBooking)
    const mentorCalls = await prisma.callBooking.findMany({
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

    // 2. Buscar llamadas con Game Changer (GCCallSlot)
    const gcCalls = await prisma.gCCallSlot.findMany({
      where: {
        participantId: user.id,
        scheduledDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      },
      include: {
        GCAvailability: {
          include: {
            Usuario: {
              select: {
                id: true,
                nombre: true,
                profileImage: true,
                telefono: true
              }
            }
          }
        },
        SmallGroup: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    logger.debug(\`📞 Llamadas mentoría para usuario \${user.id}:\`, mentorCalls.length);
    logger.debug(\`📞 Llamadas GC para usuario \${user.id}:\`, gcCalls.length);

    // Formatear llamadas de mentoría
    const formattedMentorCalls = mentorCalls.map((call: any) => {
      const scheduledDate = new Date(call.scheduledAt);
      
      return {
        id: call.id,
        type: call.type || 'DISCIPLINE',
        callType: 'MENTOR',
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

    // Formatear llamadas de GC
    const formattedGCCalls = gcCalls.map((slot: any) => {
      // Combinar scheduledDate con scheduledTime para crear la fecha completa
      const dateStr = new Date(slot.scheduledDate).toISOString().split('T')[0];
      
      return {
        id: slot.id,
        type: 'GC_CALL',
        callType: 'GAME_CHANGER',
        scheduledDate: dateStr,
        scheduledTime: slot.scheduledTime,
        endTime: slot.endTime,
        status: slot.status,
        assignedByGC: slot.assignedByGC,
        gameChanger: slot.GCAvailability?.Usuario ? {
          id: slot.GCAvailability.Usuario.id,
          nombre: slot.GCAvailability.Usuario.nombre,
          imagen: slot.GCAvailability.Usuario.profileImage,
          telefono: slot.GCAvailability.Usuario.telefono
        } : null,
        squad: slot.SmallGroup
      };
    });

    // Combinar y ordenar por fecha
    const allCalls = [...formattedMentorCalls, ...formattedGCCalls].sort((a, b) => {
      const dateA = new Date(\`\${a.scheduledDate}T\${a.scheduledTime}\`);
      const dateB = new Date(\`\${b.scheduledDate}T\${b.scheduledTime}\`);
      return dateA.getTime() - dateB.getTime();
    });

    return NextResponse.json({
      calls: allCalls,
      total: allCalls.length,
      breakdown: {
        mentorCalls: formattedMentorCalls.length,
        gcCalls: formattedGCCalls.length
      }
    });

  } catch (error) {
    logger.error('Error fetching upcoming calls:', error);
    return NextResponse.json(
      { error: 'Error al obtener llamadas' },
      { status: 500 }
    );
  }
}
