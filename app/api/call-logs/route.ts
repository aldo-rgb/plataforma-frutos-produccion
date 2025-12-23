import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST: Registrar asistencia o falta
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, status, notes, callDate } = body;

    const mentorId = Number(session.user.id);

    // Validar status
    if (!['ATTENDED', 'MISSED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ 
        error: 'Estado inválido. Debe ser ATTENDED, MISSED o CANCELLED' 
      }, { status: 400 });
    }

    // Obtener suscripción del estudiante
    const subscription = await prisma.disciplineSubscription.findFirst({
      where: {
        studentId: Number(studentId),
        mentorId,
        status: 'ACTIVE'
      }
    });

    if (!subscription) {
      return NextResponse.json({ 
        error: 'El estudiante no tiene una suscripción activa contigo' 
      }, { status: 404 });
    }

    const logDate = callDate ? new Date(callDate) : new Date();
    const dayOfWeek = logDate.getDay();

    // Crear el log de asistencia
    const callLog = await prisma.callLog.create({
      data: {
        studentId: Number(studentId),
        mentorId,
        subscriptionId: subscription.id,
        callDate: logDate,
        dayOfWeek,
        status,
        notes
      }
    });

    // Si es MISSED, incrementar contador de faltas
    if (status === 'MISSED') {
      const updatedSub = await prisma.disciplineSubscription.update({
        where: { id: subscription.id },
        data: {
          missedCallsCount: {
            increment: 1
          }
        }
      });

      // Si alcanzó 3 faltas, suspender la suscripción
      if (updatedSub.missedCallsCount >= 3) {
        await prisma.disciplineSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'DROPPED',
            endDate: new Date()
          }
        });

        console.log(`⚠️ Estudiante ${studentId} suspendido por 3 faltas`);

        return NextResponse.json({
          success: true,
          callLog,
          suspended: true,
          message: 'Asistencia registrada. El estudiante ha sido suspendido por alcanzar 3 faltas.'
        });
      }

      console.log(`❌ Falta registrada para estudiante ${studentId}. Total: ${updatedSub.missedCallsCount}/3`);
    } else if (status === 'ATTENDED') {
      console.log(`✅ Asistencia registrada para estudiante ${studentId}`);
    }

    return NextResponse.json({
      success: true,
      callLog,
      message: status === 'ATTENDED' ? 'Asistencia registrada correctamente' : 'Falta registrada'
    });

  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// GET: Obtener historial de llamadas
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const mentorId = searchParams.get('mentorId');
    const date = searchParams.get('date'); // Formato: YYYY-MM-DD
    const limit = parseInt(searchParams.get('limit') || '50');

    const userId = Number(session.user.id);

    // Construir filtros
    const where: any = {};
    
    if (studentId) {
      where.studentId = Number(studentId);
    }
    
    if (mentorId) {
      where.mentorId = Number(mentorId);
    }

    // Filtrar por fecha específica
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      where.callDate = {
        gte: targetDate,
        lt: nextDay
      };
    }

    // Si no se especifica nada, mostrar los logs del usuario actual
    if (!studentId && !mentorId) {
      where.OR = [
        { studentId: userId },
        { mentorId: userId }
      ];
    }

    const callLogs = await prisma.callLog.findMany({
      where,
      orderBy: { callDate: 'desc' },
      take: limit
    });

    // Fetch student and mentor details separately
    const enrichedCallLogs = await Promise.all(
      callLogs.map(async (log) => {
        const [student, mentor] = await Promise.all([
          prisma.usuario.findUnique({
            where: { id: log.studentId },
            select: { id: true, nombre: true, email: true }
          }),
          prisma.usuario.findUnique({
            where: { id: log.mentorId },
            select: { id: true, nombre: true }
          })
        ]);
        return { ...log, student, mentor };
      })
    );

    // Calcular estadísticas
    const stats = {
      total: callLogs.length,
      attended: callLogs.filter(log => log.status === 'ATTENDED').length,
      missed: callLogs.filter(log => log.status === 'MISSED').length,
      cancelled: callLogs.filter(log => log.status === 'CANCELLED').length
    };

    return NextResponse.json({
      callLogs: enrichedCallLogs,
      stats
    });

  } catch (error) {
    console.error('Error al obtener historial de llamadas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
