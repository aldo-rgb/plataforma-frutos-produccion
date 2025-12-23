import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * 📊 API: Obtener alumnos asignados al mentor con métricas
 * GET /api/mentor/mis-alumnos
 * 
 * Retorna:
 * - Datos básicos del alumno
 * - Vidas restantes (3 - missedCallsCount)
 * - Llamadas de la semana actual
 * - Estado de evidencias pendientes
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea mentor
    if (session.user.rol !== 'MENTOR' && session.user.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'Solo mentores pueden acceder' }, { status: 403 });
    }

    const mentorId = session.user.id;

    // Obtener todos los alumnos asignados a este mentor
    const alumnos = await prisma.usuario.findMany({
      where: {
        mentorId: mentorId
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        missedCallsCount: true,
        suscripcion: true,
        isActive: true,
        
        // Evidencias pendientes
        evidenciasAccion: {
          where: {
            estado: 'PENDIENTE'
          },
          select: {
            id: true
          }
        },
        
        // Llamadas de esta semana
        callsAsStudent: {
          where: {
            // Obtener solo llamadas de esta semana
            scheduledAt: {
              gte: getStartOfWeek(),
              lte: getEndOfWeek()
            }
          },
          select: {
            id: true,
            status: true,
            scheduledAt: true
          },
          orderBy: {
            scheduledAt: 'asc'
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Transformar datos para el frontend
    const alumnosConMetricas = alumnos.map((alumno: typeof alumnos[number]) => {
      const vidasRestantes = 3 - alumno.missedCallsCount;
      const llamadasCompletadas = alumno.CallBooking_CallBooking_studentIdToUsuario.filter(
        (call: typeof alumno.CallBooking_CallBooking_studentIdToUsuario[number]) => call.status === 'COMPLETED'
      ).length;
      const evidenciasPendientes = alumno.EvidenciaAccion.length;
      
      // Determinar estado del alumno
      let statusColor = 'green'; // Al día
      let statusText = 'Al día';
      
      if (alumno.missedCallsCount >= 3) {
        statusColor = 'red';
        statusText = 'ELIMINADO';
      } else if (llamadasCompletadas === 0 && new Date().getDay() > 3) {
        // Si ya pasó miércoles y no tiene llamadas
        statusColor = 'yellow';
        statusText = 'En riesgo';
      } else if (evidenciasPendientes > 5) {
        statusColor = 'orange';
        statusText = 'Atrasado';
      }

      return {
        id: alumno.id,
        nombre: alumno.nombre,
        email: alumno.email,
        imagen: alumno.imagen,
        vidasRestantes,
        missedCallsCount: alumno.missedCallsCount,
        llamadasSemana: {
          completadas: llamadasCompletadas,
          total: alumno.callsAsStudent.length,
          meta: 2 // Meta de 2 llamadas por semana
        },
        evidencias: {
          pendientes: evidenciasPendientes,
          status: evidenciasPendientes === 0 ? 'Al día' : `${evidenciasPendientes} pendientes`
        },
        status: {
          color: statusColor,
          text: statusText
        },
        isActive: alumno.isActive,
        suscripcion: alumno.suscripcion
      };
    });

    console.log(`📊 Mentor ${session.user.name || session.user.email} consultó ${alumnosConMetricas.length} alumnos`);

    return NextResponse.json({
      success: true,
      alumnos: alumnosConMetricas,
      resumen: {
        total: alumnosConMetricas.length,
        enRiesgo: alumnosConMetricas.filter((a: typeof alumnosConMetricas[number]) => a.status.color === 'yellow').length,
        eliminados: alumnosConMetricas.filter((a: typeof alumnosConMetricas[number]) => a.missedCallsCount >= 3).length,
        alDia: alumnosConMetricas.filter((a: typeof alumnosConMetricas[number]) => a.status.color === 'green').length
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener alumnos del mentor:', error);
    return NextResponse.json({ 
      error: 'Error al cargar alumnos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Helpers para calcular inicio/fin de semana
 */
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lunes como inicio
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getEndOfWeek(): Date {
  const startOfWeek = getStartOfWeek();
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}
