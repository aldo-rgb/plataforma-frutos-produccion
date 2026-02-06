import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener datos del mentor
    const mentor = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    if (!mentor || (mentor.rol !== 'MENTOR' && mentor.rol !== 'LIDER')) {
      return NextResponse.json({ error: 'Usuario no es mentor' }, { status: 403 });
    }

    // Obtener todos los participantes con ProgramEnrollment activo de este mentor
    const participantes = await prisma.usuario.findMany({
      where: {
        AND: [
          {
            OR: [
              { assignedMentorId: mentor.id },
              {
                ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
                  some: { 
                    mentorId: mentor.id, 
                    status: 'ACTIVE' 
                  }
                }
              }
            ]
          },
          { rol: 'PARTICIPANTE' },
          { isActive: true }
        ]
      },
      include: {
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: {
            mentorId: mentor.id,
            status: 'ACTIVE'
          },
          take: 1
        }
      }
    });

    logger.debug(`🔍 [Disciplina] Mentor ${mentor.id} tiene ${participantes.length} participantes activos`);

    // Enriquecer con información de llamadas
    const participantesEnriquecidos = await Promise.all(
      participantes.map(async (participante) => {
        const enrollment = participante.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];

        if (!enrollment) {
          return null; // Saltar participantes sin enrollment activo
        }

        // Buscar llamada HOY (tipo DISCIPLINE, estado PENDING, que no esté marcada como ABSENT)
        // Usar fecha UTC del servidor - el cliente maneja su zona horaria
        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);
        
        const manana = new Date(hoy);
        manana.setUTCDate(manana.getUTCDate() + 1);

        const llamadaHoy = await prisma.callBooking.findFirst({
          where: {
            programEnrollmentId: enrollment.id,
            type: 'DISCIPLINE',
            scheduledAt: {
              gte: hoy,
              lt: manana
            },
            attendanceStatus: { in: ['PENDING', 'PRESENT'] } // Excluir las marcadas como ABSENT
          },
          orderBy: { scheduledAt: 'asc' }
        });

        // NO buscar próximas llamadas - solo mostrar la del día actual
        // Si ya se procesó la de hoy, el widget no mostrará nada hasta mañana
        const proximaLlamada = null;

        return {
          id: participante.id,
          nombre: participante.nombre || 'Sin nombre',
          email: participante.email,
          profileImage: participante.profileImage,
          enrollment: {
            id: enrollment.id,
            missedCallsCount: enrollment.missedCallsCount || 0,
            maxMissedAllowed: enrollment.maxMissedAllowed || 3,
            totalWeeks: enrollment.totalWeeks || 17
          },
          llamadaHoy: llamadaHoy ? {
            id: llamadaHoy.id,
            scheduledAt: llamadaHoy.scheduledAt.toISOString(),
            weekNumber: llamadaHoy.weekNumber || 0,
            attendanceStatus: llamadaHoy.attendanceStatus || 'PENDING',
            status: llamadaHoy.status
          } : null,
          proximaLlamada: proximaLlamada ? {
            id: proximaLlamada.id,
            scheduledAt: proximaLlamada.scheduledAt.toISOString(),
            weekNumber: proximaLlamada.weekNumber || 0,
            attendanceStatus: proximaLlamada.attendanceStatus || 'PENDING',
            status: proximaLlamada.status
          } : null
        };
      })
    );

    // Filtrar nulls (participantes sin enrollment activo)
    const participantesValidos = participantesEnriquecidos.filter(Boolean);

    logger.debug(`✅ [Disciplina] Retornando ${participantesValidos.length} participantes válidos`);
    logger.debug(`📊 [Disciplina] Detalles:`, participantesValidos.map(p => ({
      nombre: p?.nombre,
      tieneHoy: !!p?.llamadaHoy,
      tieneProxima: !!p?.proximaLlamada
    })));

    return NextResponse.json({
      success: true,
      participantes: participantesValidos
    });

  } catch (error) {
    logger.error('Error obteniendo participantes:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error obteniendo participantes' 
    }, { status: 500 });
  }
}
