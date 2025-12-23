import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/program/status
 * Obtiene el estado actual del programa del usuario
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar programa activo del usuario
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'SUSPENDED'] }
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!enrollment) {
      return NextResponse.json({
        hasProgram: false,
        message: 'No tienes un programa activo'
      });
    }

    // Obtener próxima sesión
    const nextSession = await prisma.callBooking.findFirst({
      where: {
        programEnrollmentId: enrollment.id,
        scheduledAt: { gte: new Date() },
        status: { not: 'CANCELLED' }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    // Contar sesiones completadas
    const completedSessions = await prisma.callBooking.count({
      where: {
        programEnrollmentId: enrollment.id,
        attendanceStatus: 'PRESENT'
      }
    });

    // Contar sesiones totales
    const totalSessions = await prisma.callBooking.count({
      where: {
        programEnrollmentId: enrollment.id
      }
    });

    // Calcular semana actual
    const currentWeek = Math.ceil(completedSessions / 2) + 1;

    // Calcular vidas restantes
    const livesRemaining = enrollment.maxMissedAllowed - enrollment.missedCallsCount;

    // Calcular progreso
    const progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Calcular tiempo hasta próxima sesión
    let timeUntilNext = null;
    if (nextSession) {
      const now = new Date();
      const diff = nextSession.scheduledAt.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      timeUntilNext = {
        hours,
        minutes,
        seconds,
        totalHours: diff / (1000 * 60 * 60),
        isUrgent: hours < 24 // Menos de 24 horas
      };
    }

    return NextResponse.json({
      hasProgram: true,
      status: enrollment.status,
      currentWeek,
      totalWeeks: enrollment.totalWeeks,
      missedCalls: enrollment.missedCallsCount,
      maxMissedAllowed: enrollment.maxMissedAllowed,
      livesRemaining,
      completedSessions,
      totalSessions,
      remainingSessions: totalSessions - completedSessions,
      progress: Math.round(progress),
      mentor: enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario,
      nextSession: nextSession ? {
        id: nextSession.id,
        date: nextSession.scheduledAt.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'America/Mexico_City'
        }).split('/').reverse().join('-'), // Convertir DD/MM/YYYY a YYYY-MM-DD
        time: nextSession.scheduledAt.toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Mexico_City'
        }),
        weekNumber: nextSession.weekNumber,
        scheduledAt: nextSession.scheduledAt,
        timeUntil: timeUntilNext
      } : null,
      startDate: enrollment.startDate,
      endDate: enrollment.endDate,
      isSuspended: enrollment.status === 'SUSPENDED'
    });

  } catch (error) {
    console.error('❌ Error en program/status:', error);
    return NextResponse.json({ 
      error: 'Error al obtener estado del programa' 
    }, { status: 500 });
  }
}
