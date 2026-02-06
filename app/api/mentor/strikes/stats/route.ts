import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/mentor/strikes/stats
 * 
 * Obtiene estadísticas de strikes del mentor actual:
 * - Total de participantes
 * - Participantes en riesgo (2 strikes)
 * - Participantes suspendidos
 * - Tasa de asistencia general
 * - Detalles de cada participante
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mentorId = session.user.id;

    // Verificar que sea mentor
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: { rol: true }
    });

    if (!mentor || mentor.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'Usuario no es mentor' }, { status: 403 });
    }

    // Obtener todos los enrollments activos del mentor
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        mentorId: mentorId,
        status: {
          in: ['ACTIVE', 'SUSPENDED']
        }
      },
      include: {
        Usuario_ProgramEnrollment_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        CallBookings: {
          where: {
            type: 'DISCIPLINE',
            status: 'COMPLETED'
          },
          select: {
            id: true,
            attendanceStatus: true
          }
        }
      }
    });

    // Calcular estadísticas
    const totalParticipantes = enrollments.length;
    let participantesEnRiesgo = 0;
    let participantesSuspendidos = 0;
    let totalSesiones = 0;
    let sesionesAsistidas = 0;

    const detalles = enrollments.map(enrollment => {
      const strikes = enrollment.missedCallsCount || 0;
      const maxStrikes = enrollment.maxMissedAllowed || 3;
      const status = enrollment.status;

      // Contar en riesgo (2 strikes y activo)
      if (strikes === 2 && status === 'ACTIVE') {
        participantesEnRiesgo++;
      }

      // Contar suspendidos
      if (status === 'SUSPENDED') {
        participantesSuspendidos++;
      }

      // Calcular asistencia
      const sesionesParticipante = enrollment.CallBookings || [];
      totalSesiones += sesionesParticipante.length;
      sesionesAsistidas += sesionesParticipante.filter((s: any) => s.attendanceStatus === 'PRESENT').length;

      return {
        id: enrollment.Usuario_ProgramEnrollment_userIdToUsuario.id,
        nombre: enrollment.Usuario_ProgramEnrollment_userIdToUsuario.nombre,
        strikes: strikes,
        maxStrikes: maxStrikes,
        status: status
      };
    });

    // Calcular tasa de asistencia global
    const tasaAsistencia = totalSesiones > 0 
      ? (sesionesAsistidas / totalSesiones) * 100 
      : 100;

    return NextResponse.json({
      success: true,
      stats: {
        totalParticipantes,
        participantesEnRiesgo,
        participantesSuspendidos,
        tasaAsistencia,
        detalles
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de strikes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
