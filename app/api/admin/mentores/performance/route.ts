import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/admin/mentores/performance
 * Obtiene datos de rendimiento de todos los mentores activos
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea admin o director
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true }
    });

    if (!usuario || !['ADMINISTRADOR', 'SUPER_ADMIN', 'COORDINADOR'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    logger.debug('📊 Cargando rendimiento de mentores...');

    // Obtener todos los mentores activos con sus datos
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: { in: ['MENTOR', 'LIDER'] },
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        rol: true
      }
    });

    // Para cada mentor, calcular sus métricas
    const mentoresConMetricas = await Promise.all(
      mentores.map(async (mentor) => {
        // Obtener enrollments activos
        const enrollments = await prisma.programEnrollment.findMany({
          where: {
            mentorId: mentor.id,
            status: 'ACTIVE'
          }
        });

        const asignados = enrollments.length;

        // Calcular llamadas perdidas (TGLP)
        const totalLlamadas = await prisma.callBooking.count({
          where: {
            mentorId: mentor.id,
            type: 'DISCIPLINE',
            status: 'CONFIRMED'
          }
        });

        const llamadasPerdidas = await prisma.callBooking.count({
          where: {
            mentorId: mentor.id,
            type: 'DISCIPLINE',
            status: 'CONFIRMED',
            attendanceStatus: 'STUDENT_MISSED'
          }
        });

        const tglp = totalLlamadas > 0 ? Math.round((llamadasPerdidas / totalLlamadas) * 100) : 0;

        // Calcular tiempo promedio de revisión de evidencias
        const evidenciasRevisadas = await prisma.evidenciaAccion.findMany({
          where: {
            estado: 'APROBADA',
            Usuario: {
              OR: [
                { mentorId: mentor.id },
                { assignedMentorId: mentor.id }
              ]
            }
          },
          select: {
            createdAt: true,
            updatedAt: true
          },
          take: 50, // Últimas 50 revisiones
          orderBy: {
            updatedAt: 'desc'
          }
        });

        let tiempoRevision = 'N/A';
        let promedioHoras = 0;
        if (evidenciasRevisadas.length > 0) {
          const tiempos = evidenciasRevisadas
            .filter(e => e.updatedAt && e.createdAt)
            .map(e => {
              const diff = new Date(e.updatedAt!).getTime() - new Date(e.createdAt).getTime();
              return diff / (1000 * 60 * 60); // Convertir a horas
            });

          if (tiempos.length > 0) {
            promedioHoras = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
            if (promedioHoras < 1) {
              tiempoRevision = `${Math.round(promedioHoras * 60)}m`;
            } else if (promedioHoras < 24) {
              tiempoRevision = `${promedioHoras.toFixed(1)}h`;
            } else {
              tiempoRevision = '24h+';
            }
          }
        }

        // Determinar status basado en métricas
        let status = 'normal';
        if (tglp <= 10 && promedioHoras < 2) {
          status = 'elite';
        } else if (tglp > 30 || promedioHoras > 12) {
          status = 'riesgo';
        }

        return {
          id: mentor.id,
          nombre: mentor.nombre,
          rol: mentor.rol,
          asignados,
          tglp,
          tiempoRevision,
          rating: 0, // Placeholder, se puede calcular después si es necesario
          status
        };
      })
    );

    // Ordenar por status (elite primero, riesgo último)
    const ordenStatus: Record<string, number> = { elite: 0, normal: 1, riesgo: 2 };
    mentoresConMetricas.sort((a, b) => (ordenStatus[a.status] || 1) - (ordenStatus[b.status] || 1));

    logger.debug(`✅ ${mentoresConMetricas.length} mentores cargados con métricas`);

    return NextResponse.json({
      success: true,
      mentores: mentoresConMetricas
    });

  } catch (error) {
    logger.error('❌ Error obteniendo rendimiento de mentores:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo rendimiento de mentores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
