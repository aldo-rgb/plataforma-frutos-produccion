import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/mentor/calendario
 * Retorna las llamadas agendadas del mentor para un mes específico
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (usuario.rol !== 'MENTOR' && usuario.rol !== 'LIDER') {
      return NextResponse.json({ error: 'Solo mentores pueden acceder' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Calcular primer y último día del mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    logger.debug('📅 Buscando llamadas para:', { mentorId: usuario.id, startDate, endDate });

    let mentoriaCalls: any[] = [];
    let disciplinaCalls: any[] = [];

    // Intentar obtener llamadas de mentoría (CallBooking) - manejar errores si el modelo no existe
    try {
      mentoriaCalls = await prisma.callBooking.findMany({
        where: {
          mentorId: usuario.id,
          scheduledAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          Usuario_CallBooking_studentIdToUsuario: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });
      logger.debug('✅ Llamadas de mentoría encontradas:', mentoriaCalls.length);
    } catch (error) {
      logger.debug('⚠️ Error obteniendo CallBooking:', error);
      mentoriaCalls = [];
    }

    // Intentar obtener llamadas de disciplina (CallLog) - manejar errores
    try {
      disciplinaCalls = await prisma.callLog.findMany({
        where: {
          mentorId: usuario.id,
          callDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          Usuario_CallLog_studentIdToUsuario: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: {
          callDate: 'asc'
        }
      });
      logger.debug('✅ Llamadas de disciplina encontradas:', disciplinaCalls.length);
    } catch (error) {
      logger.debug('⚠️ Error obteniendo CallLog (puede que la tabla no exista):', error);
      disciplinaCalls = [];
    }

    // Formatear llamadas de mentoría
    const formattedMentoriaCalls = mentoriaCalls.map(call => {
      const callDate = new Date(call.scheduledAt);
      const endTime = new Date(callDate.getTime() + (call.duration || 15) * 60000);

      return {
        id: call.id,
        title: 'Llamada de Mentoría',
        studentName: call.Usuario_CallBooking_studentIdToUsuario.nombre,
        studentId: call.studentId,
        type: call.type === 'MENTORSHIP' ? 'MENTORIA' : 'DISCIPLINA',
        status: call.status || 'SCHEDULED',
        scheduledDate: call.scheduledAt.toISOString(),
        startTime: callDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        endTime: endTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        duration: call.duration || 15,
        notes: call.notes || undefined,
        meetingLink: call.meetingLink || undefined
      };
    });

    // Formatear llamadas de disciplina
    const formattedDisciplinaCalls = disciplinaCalls.map(call => {
      const callDate = new Date(call.callDate);
      const endTime = new Date(callDate.getTime() + 30 * 60000); // Asumir 30 min por defecto

      return {
        id: call.id,
        title: 'Llamada de Disciplina',
        studentName: call.Usuario_CallLog_studentIdToUsuario.nombre,
        studentId: call.studentId,
        type: 'DISCIPLINA' as const,
        status: call.status || 'SCHEDULED',
        scheduledDate: call.callDate.toISOString(),
        startTime: callDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        endTime: endTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        duration: 30,
        notes: call.notes || undefined
      };
    });

    // Combinar y ordenar por fecha
    const allCalls = [...formattedMentoriaCalls, ...formattedDisciplinaCalls].sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    return NextResponse.json({
      success: true,
      calls: allCalls,
      total: allCalls.length,
      mentoriaCount: formattedMentoriaCalls.length,
      disciplinaCount: formattedDisciplinaCalls.length
    });

  } catch (error) {
    logger.error('Error obteniendo calendario:', error);
    return NextResponse.json(
      { error: 'Error al obtener calendario' },
      { status: 500 }
    );
  }
}
