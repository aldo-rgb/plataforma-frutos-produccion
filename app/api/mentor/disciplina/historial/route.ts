import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentor/disciplina/historial?participanteId=123
 * 
 * Obtiene el historial de llamadas de disciplina de un participante
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const participanteId = searchParams.get('participanteId');

    if (!participanteId) {
      return NextResponse.json({ error: 'participanteId es requerido' }, { status: 400 });
    }

    // Obtener datos del mentor
    const mentor = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    if (!mentor || (mentor.rol !== 'MENTOR' && mentor.rol !== 'LIDER' && mentor.rol !== 'ADMIN' && mentor.rol !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Usuario no tiene permisos' }, { status: 403 });
    }

    // Obtener participante
    const participante = await prisma.usuario.findUnique({
      where: { id: parseInt(participanteId) },
      select: {
        id: true,
        nombre: true,
        email: true,
        profileImage: true,
        rol: true,
      }
    });

    if (!participante) {
      return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 });
    }

    // Obtener enrollment activo
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: parseInt(participanteId),
        mentorId: mentor.id,
        status: 'ACTIVE'
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'No hay enrollment activo para este participante' }, { status: 404 });
    }

    // Obtener todas las llamadas de disciplina del enrollment
    const llamadas = await prisma.callBooking.findMany({
      where: {
        programEnrollmentId: enrollment.id,
        type: 'DISCIPLINE'
      },
      orderBy: { weekNumber: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        weekNumber: true,
        status: true,
        attendanceStatus: true,
        completedAt: true,
        notes: true,
      }
    });

    // Extraer horarios reservados únicos (día de la semana + hora)
    const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const horariosMap = new Map<string, { dayOfWeek: number; dayName: string; time: string }>();
    
    llamadas.forEach(llamada => {
      const fecha = new Date(llamada.scheduledAt);
      const dayOfWeek = fecha.getUTCDay();
      const time = fecha.toISOString().split('T')[1].substring(0, 5);
      const key = `${dayOfWeek}-${time}`;
      
      if (!horariosMap.has(key)) {
        horariosMap.set(key, {
          dayOfWeek,
          dayName: DIAS_SEMANA[dayOfWeek],
          time
        });
      }
    });

    const horariosReservados = Array.from(horariosMap.values())
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time));

    // Encontrar la próxima llamada (futura y pendiente)
    const ahora = new Date();
    const proximaLlamada = llamadas
      .filter(l => new Date(l.scheduledAt) > ahora && l.attendanceStatus === 'PENDING')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null;

    return NextResponse.json({
      success: true,
      participante: {
        id: participante.id,
        nombre: participante.nombre,
        email: participante.email,
        profileImage: participante.profileImage,
        rol: participante.rol,
      },
      enrollment: {
        id: enrollment.id,
        missedCallsCount: enrollment.missedCallsCount,
        maxMissedAllowed: enrollment.maxMissedAllowed,
        totalWeeks: enrollment.totalWeeks,
        status: enrollment.status,
      },
      horariosReservados,
      proximaLlamada: proximaLlamada ? {
        id: proximaLlamada.id,
        scheduledAt: proximaLlamada.scheduledAt,
        weekNumber: proximaLlamada.weekNumber
      } : null,
      llamadas: llamadas.map(llamada => ({
        id: llamada.id,
        scheduledAt: llamada.scheduledAt,
        weekNumber: llamada.weekNumber,
        status: llamada.status,
        attendanceStatus: llamada.attendanceStatus,
        completedAt: llamada.completedAt,
        notes: llamada.notes,
      }))
    });

  } catch (error: any) {
    console.error('[Historial] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
